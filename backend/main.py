from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests, os, random, time, datetime, json
from dotenv import load_dotenv
from fatigue_model import predict_fatigue, get_feature_importance, simulate_fatigue_trend

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

app = FastAPI(title="CareFlow API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class CaregiverCreate(BaseModel):
    name: str
    role: str
    floor: int
    status: str = "available"
    active_tasks: int = 0
    active_episodes: int = 0
    skills: List[str] = []
    assignments_today: int = 0
    eta_minutes: int = 0
    last_assigned_mins_ago: int = 30
    phone: str = "+1234567890"
    photo_url: Optional[str] = None

class AlarmEpisode(BaseModel):
    resident_name: str
    room_number: int
    floor: int
    episode_type: str
    severity: str
    trend: str
    alarms: List[str]

class AssignRequest(BaseModel):
    caregiver_id: str
    resident_name: str
    ai_explanation: Optional[str] = None

class ReportRequest(BaseModel):
    episode_id: str
    caregiver_name: str
    resident_name: str
    episode_type: str
    notes: Optional[str] = ""

class CompleteEpisodeRequest(BaseModel):
    episode_id: str
    caregiver_id: str

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str # 'admin' or 'caretaker'

CAREGIVERS = []

EPISODE_HISTORY = []
DB_FILE = "db.json"

def save_db():
    try:
        data = {"caregivers": CAREGIVERS, "history": EPISODE_HISTORY}
        with open(DB_FILE, "w") as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Error saving to DB: {e}")

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                data = json.load(f)
                global CAREGIVERS, EPISODE_HISTORY
                new_cg = data.get("caregivers", [])
                new_hist = data.get("history", [])
                if new_cg: CAREGIVERS = new_cg
                if new_hist: EPISODE_HISTORY = new_hist
        except Exception as e:
            print(f"Error loading from DB: {e}")

load_db()

SHIFT_START_HOUR = datetime.datetime.now().hour

def current_shift_hour():
    return max(0, min(12, datetime.datetime.now().hour - SHIFT_START_HOUR))

def get_system_pressure():
    """Calculate systemic load: Ratio of active cases to total caregivers."""
    if not CAREGIVERS: return 0.5
    active = sum(1 for e in EPISODE_HISTORY if e.get("status") == "open")
    # Ratio: 1.0 means 1 case per staff. > 1.5 is high pressure.
    return round(active / len(CAREGIVERS), 2)

def ai_generate_report(req: ReportRequest):
    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        return f"Incident Report for {req.resident_name}: {req.episode_type}. Caregiver {req.caregiver_name} attended. Outcome stable."
    
    prompt = f"""You are a clinical documentation AI. Create a professional, 3-paragraph medical incident report for an elderly care facility.
    Resident: {req.resident_name}
    Incident Type: {req.episode_type}
    Attending Responder: {req.caregiver_name}
    Self-Reported Notes: {req.notes}
    Tone: Professional, clinical, precise. Focus on observations, intervention, and follow-up. Keep it under 150 words."""
    
    try:
        res = requests.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization":f"Bearer {GROQ_API_KEY}","Content-Type":"application/json"},
            json={"model":"llama3-8b-8192","messages":[{"role":"user","content":prompt}],
                  "max_tokens":250, "temperature":0.3}, timeout=10)
        
        data = res.json()
        if res.status_code != 200:
            error_msg = data.get("error", {}).get("message", "Unknown API error")
            return f"AI Report Generation Error: {error_msg}"
            
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"System Error generating automated report: {str(e)}"

# ── SCORING ENGINE ───────────────────────────────────────────────────────────
STATUS_SCORE = {"available":1.0,"rounds":0.6,"attending":0.4,"break":0.2,"out":0.0}
SKILL_MAP = {"cardiac":["cardiac"],"fall":["fall"],"respiratory":["respiratory"],
             "wandering":["dementia"],"medication":["medication"]}

def score_proximity(cf, rf): diff=abs(cf-rf); return 1.0 if diff==0 else (0.5 if diff==1 else 0.15)
def score_workload(cg): return max(0.0, 1.0-((cg["active_tasks"]+cg["active_episodes"]*2)/10.0))
def score_skill(cg,etype): req=SKILL_MAP.get(etype,[]); return 1.0 if any(s in cg["skills"] for s in req) else 0.3
def score_eta(cg): return 1.0 if cg["eta_minutes"]==0 else max(0.0,1.0-(cg["eta_minutes"]/30.0))
def score_fairness(cg): return max(0.0,1.0-(cg["assignments_today"]/10.0))
def predict_arrival(cg,ep): return cg["eta_minutes"] + abs(cg["floor"]-ep.floor)*2 + 1

def compute_score(cg, ep: AlarmEpisode, fatigue_info: dict, system_pressure: float):
    crit = ep.severity == "critical"
    emerg = ep.severity == "emergency"
    
    # Floor Constraint: Don't pull the last available person from a high-need floor
    floor_staff = [c for c in CAREGIVERS if c["floor"] == cg["floor"]]
    other_available = sum(1 for c in floor_staff if c["id"] != cg["id"] and c["status"] == "available")
    floor_buffer = 1.0 if (other_available > 0 or emerg or crit) else 0.4
    
    # Ultra-high weight for skill and status during emergencies
    w = {
        "workload": 0.15 if emerg else (0.20 if crit else 0.25),
        "status": 0.30 if emerg else (0.25 if crit else 0.20),
        "proximity": 0.30 if emerg else (0.25 if crit else 0.20),
        "skill": 0.20 if emerg else 0.15,
        "eta": 0.05 if crit else 0.12,
        "fairness": 0.00 if emerg else (0.05 if crit else 0.08)
    }
    b = {"workload":round(score_workload(cg),2),"status":STATUS_SCORE.get(cg["status"],0),
         "proximity":round(score_proximity(cg["floor"],ep.floor),2),
         "skill":score_skill(cg,ep.episode_type),"eta":round(score_eta(cg),2),
         "fairness":round(score_fairness(cg),2)}
    raw = sum(w[k]*b[k] for k in w)
    # Compound Fatigue with Floor Buffer and System Pressure
    raw *= fatigue_info.get("dispatch_penalty", 1.0)
    raw *= floor_buffer
    
    # Systemic Pressure Adjustment: High pressure makes availability 2x more important
    if system_pressure > 1.2:
        raw *= (0.8 if cg["status"] != "available" else 1.1)

    return round(raw*100,1), b

def trigger_phone_sos(caregiver_name, phone_number, resident_name, room):
    """
    Simulation of an external API call (like Twilio or Vonage).
    In a real production environment, this would hit an SMS/Voice gateway.
    """
    print(f"📡 [SOS SIGNAL] Outbound call triggered to {caregiver_name} ({phone_number})")
    print(f"🎙️ [MESSAGE] 'CareFlow Alert: Emergency for {resident_name}. Proceed to Room {room} immediately.'")
    return True

# ── AI EXPLANATION ───────────────────────────────────────────────────────────
def ai_explain(cg, score, breakdown, ep, rank, fatigue):
    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        return fallback_explain(cg, score, breakdown, ep, rank, fatigue)
    prompt = f"""You are an AI for an elderly care home dispatch system.
A {ep.severity.upper()} {ep.episode_type} alarm for {ep.resident_name}, Room {ep.room_number} Floor {ep.floor}. Trend: {ep.trend}.
Caregiver: {cg['name']}, Role: {cg['role']}, Floor: {cg['floor']}, Status: {cg['status']},
Tasks: {cg['active_tasks']}, Skills: {', '.join(cg['skills'])}, ETA: {cg['eta_minutes']} min,
ML Fatigue Score: {fatigue['fatigue_score']}/100 ({fatigue['fatigue_level']}), Dispatch Score: {score}%, Rank #{rank}.
Write 2 plain-English sentences explaining why this caregiver is ranked #{rank}. Mention their fatigue level naturally. Start with their name."""
    try:
        res = requests.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization":f"Bearer {GROQ_API_KEY}","Content-Type":"application/json"},
            json={"model":"llama3-8b-8192","messages":[{"role":"user","content":prompt}],
                  "max_tokens":120,"temperature":0.4}, timeout=8)
        return res.json()["choices"][0]["message"]["content"].strip()
    except:
        return fallback_explain(cg, score, breakdown, ep, rank, fatigue)

def fallback_explain(cg, score, breakdown, ep, rank, fatigue):
    r = []
    if breakdown["proximity"] >= 0.9: r.append(f"same floor as {ep.resident_name}")
    elif breakdown["proximity"] >= 0.5: r.append("one floor away")
    if breakdown["status"] >= 0.9: r.append("fully available")
    elif breakdown["status"] >= 0.5: r.append(f"free in ~{cg['eta_minutes']} min")
    if breakdown["workload"] >= 0.7: r.append("light workload")
    if breakdown["skill"] == 1.0: r.append(f"trained in {ep.episode_type}")
    return (f"{cg['name']} scores {score}% — {', '.join(r[:3])}. "
            f"ML fatigue: {fatigue['fatigue_score']}/100 ({fatigue['fatigue_level']}) "
            f"— {fatigue['recommendation']}")

@app.get("/")
def root(): return {"message": "CareFlow API running — ML Fatigue Model active!"}

@app.get("/caregivers")
def get_caregivers():
    sh = current_shift_hour(); sp = get_system_pressure()
    return [{**cg, "fatigue": predict_fatigue(cg, shift_hour=sh, system_pressure=sp)} for cg in CAREGIVERS]

@app.post("/caregivers")
def add_caregiver(cg: CaregiverCreate):
    new_id = f"cg{len(CAREGIVERS) + random.randint(100, 999)}"
    gen_username = cg.name.lower().replace(" ", "") + str(random.randint(10, 99))
    gen_password = "care" + str(random.randint(1000, 9999))
    
    new_cg = cg.dict()
    new_cg["id"] = new_id
    new_cg["username"] = gen_username
    new_cg["password"] = gen_password
    new_cg["burnout_flag"] = False
    CAREGIVERS.append(new_cg)
    save_db()
    return {"success": True, "caregiver": new_cg}

@app.post("/login")
def login(req: LoginRequest):
    if req.role == "admin":
        if req.username == "admin" and req.password == "admin123":
            return {"success": True, "user": {"role": "admin", "name": "Administrator"}}
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    for cg in CAREGIVERS:
        if cg["username"] == req.username and cg["password"] == req.password:
            return {"success": True, "user": {**cg, "role": "caretaker"}}
    
    raise HTTPException(status_code=401, detail="Invalid caretaker credentials")

@app.get("/tasks/{cg_id}")
def get_cg_tasks(cg_id: str):
    tasks = [ep for ep in EPISODE_HISTORY if ep.get("caregiver_id") == cg_id and ep.get("status") == "open"]
    return tasks


@app.delete("/caregivers/{cg_id}")
def delete_caregiver(cg_id: str):
    global CAREGIVERS
    for cg in CAREGIVERS:
        if cg["id"] == cg_id:
            CAREGIVERS = [c for c in CAREGIVERS if c["id"] != cg_id]
            save_db()
            return {"success": True, "message": f"Caregiver {cg_id} deleted"}
    raise HTTPException(status_code=404, detail="Caregiver not found")

@app.post("/recommend")
def recommend(episode: AlarmEpisode):
    sh = current_shift_hour(); sp = get_system_pressure()
    scored = []
    for cg in CAREGIVERS:
        fatigue = predict_fatigue(cg, shift_hour=sh, system_pressure=sp)
        score, breakdown = compute_score(cg, episode, fatigue, system_pressure=sp)
        scored.append({"caregiver":cg,"score":score,"breakdown":breakdown,
                       "predicted_eta_minutes":predict_arrival(cg,episode),"fatigue":fatigue})
    scored.sort(key=lambda x: x["score"], reverse=True)

    # Check if a qualified available caregiver exists
    available_scored = [s for s in scored if s["caregiver"]["status"] == "available"]
    
    if not available_scored:
        return {"success": False, "message": "No available caregivers found. All staff are currently attending to other duties."}

    results = []
    # Use available_scored for recommendations to ensure we only pick available staff
    target_list = available_scored if available_scored else scored
    for i, item in enumerate(scored[:3]):
        explanation = ai_explain(item["caregiver"],item["score"],item["breakdown"],
                                 episode, i+1, item["fatigue"])
        results.append({"rank":["primary","secondary","backup"][i],
                        "caregiver":item["caregiver"],"score":item["score"],
                        "breakdown":item["breakdown"],
                        "predicted_eta_minutes":item["predicted_eta_minutes"],
                        "fatigue":item["fatigue"],"explanation":explanation})

    new_ep = {
        "id": f"EP{int(time.time())}",
        "resident": episode.resident_name,
        "resident_name": episode.resident_name, # keep for dispatch form
        "room_number": episode.room_number,
        "floor": episode.floor,
        "type": episode.episode_type,
        "episode_type": episode.episode_type, # keep for dispatch form
        "severity": episode.severity,
        "trend": episode.trend,
        "alarms": episode.alarms,
        "timestamp": time.time(),
        "status": "open",
        "caregiver_id": scored[0]["caregiver"]["id"],
        "recommended": scored[0]["caregiver"]["name"],
        "recommended_fatigue": scored[0]["fatigue"]["fatigue_score"],
        "ai_explanation": results[0]["explanation"],
        "external_alerts": []
    }
    EPISODE_HISTORY.append(new_ep)
    save_db()

    return {"success": True, "episode": new_ep, "recommendations": results,
            "all_scores":[{"name":s["caregiver"]["name"],"score":s["score"],
                           "fatigue_score":s["fatigue"]["fatigue_score"],
                           "fatigue_level":s["fatigue"]["fatigue_level"]} for s in scored]}

@app.post("/assign")
def assign(req: AssignRequest):
    for cg in CAREGIVERS:
        if cg["id"] == req.caregiver_id:
            # Update the episode in history if we know which one it is
            target_ep = None
            for ep in reversed(EPISODE_HISTORY):
                if ep["resident_name"] == req.resident_name and ep["status"] == "open":
                    target_ep = ep
                    break
            
            if target_ep:
                target_ep["caregiver_id"] = req.caregiver_id
                target_ep["assigned_to"] = cg["name"]
                if req.ai_explanation:
                    target_ep["ai_explanation"] = req.ai_explanation

            cg["active_episodes"] += 1; cg["active_tasks"] += 1
            cg["assignments_today"] += 1; cg["last_assigned_mins_ago"] = 0
            if cg["status"] == "available": cg["status"] = "attending"
            fatigue = predict_fatigue(cg, shift_hour=current_shift_hour(), system_pressure=get_system_pressure())
            cg["burnout_flag"] = fatigue["fatigue_level"] in ["High","Critical"]

            # Trigger the SOS Call
            trigger_phone_sos(cg["name"], cg.get("phone", "+1 555-0199"), req.resident_name, "Scanning...")

            save_db()
            return {"success":True,"message":f"SOS Dispatched for {cg['name']}", "phone_notified": True,
                    "updated_fatigue":fatigue}
    raise HTTPException(status_code=404, detail="Caregiver not found")

@app.delete("/history/clear")
def clear_history():
    global EPISODE_HISTORY
    EPISODE_HISTORY = []
    save_db()
    return {"success": True, "message": "History cleared"}

@app.post("/complete")
def complete_episode(req: CompleteEpisodeRequest):
    # 1. Update Episode Status
    episode_found = False
    for ep in EPISODE_HISTORY:
        if ep["id"] == req.episode_id:
            ep["status"] = "completed"
            ep["completed_at"] = time.time()
            episode_found = True
            break
    
    # 2. Update Caregiver Availability
    for cg in CAREGIVERS:
        if cg["id"] == req.caregiver_id:
            cg["active_episodes"] = max(0, cg["active_episodes"] - 1)
            cg["active_tasks"] = max(0, cg["active_tasks"] - 1)
            if cg["active_episodes"] == 0:
                cg["status"] = "available"
            save_db()
            return {"success": True, "message": f"Case resolved. {cg['name']} is now free."}
            
    if not episode_found:
        raise HTTPException(status_code=404, detail="Episode not found")
    raise HTTPException(status_code=404, detail="Caregiver not found")

@app.post("/history/{episode_id}/alert")
def log_external_alert(episode_id: str, alert_type: str):
    for ep in EPISODE_HISTORY:
        if ep["id"] == episode_id:
            if "external_alerts" not in ep: ep["external_alerts"] = []
            
            # Prevent duplicate alerts of the same type
            if any(a["type"] == alert_type for a in ep["external_alerts"]):
                return {"success": False, "message": f"{alert_type} already dispatched"}
                
            ep["external_alerts"].append({"type": alert_type, "timestamp": time.time()})
            return {"success": True, "message": f"{alert_type} logged for {ep['resident']}"}
    raise HTTPException(status_code=404, detail="Episode not found")

@app.get("/fatigue/all")
def fatigue_all():
    sh = current_shift_hour(); sp = get_system_pressure()
    return {"shift_hour":sh, "system_pressure":sp,
            "predictions":[{"caregiver_id":cg["id"],"name":cg["name"],
                            **predict_fatigue(cg,shift_hour=sh, system_pressure=sp)} for cg in CAREGIVERS],
            "feature_importance":get_feature_importance()}

@app.get("/fatigue/{caregiver_id}")
def fatigue_single(caregiver_id: str):
    cg = next((c for c in CAREGIVERS if c["id"]==caregiver_id), None)
    if not cg: raise HTTPException(status_code=404, detail="Caregiver not found")
    sp = get_system_pressure()
    return {"caregiver":cg,"fatigue":predict_fatigue(cg,shift_hour=current_shift_hour(), system_pressure=sp),
            "shift_trend":simulate_fatigue_trend(cg),"feature_importance":get_feature_importance()}

@app.get("/episodes/history")
def get_history(): return EPISODE_HISTORY[-20:]

@app.post("/simulate")
def simulate_alarm():
    residents = [{"name":"Mr. George","room":101,"floor":1},{"name":"Mrs. Patel","room":205,"floor":2},
                 {"name":"Mr. Thomas","room":312,"floor":3},{"name":"Mrs. Nair","room":108,"floor":1}]
    types = ["cardiac","fall","wandering","respiratory","medication", "unconscious", "seizure", "trauma"]
    alarm_map = {"cardiac":["Heart rate spike","BP increase","HRV abnormal"],
                 "fall":["Motion sensor triggered","No movement detected","SOS pressed"],
                 "respiratory":["SpO2 drop","Breathing irregular"],
                 "wandering":["Geofence breach","Door sensor triggered"],
                 "medication":["Missed dose alert","Medication overdue"],
                 "unconscious":["No breathing detected", "Critical vitals drop"],
                 "seizure":["Convulsive movement detected"],
                 "trauma":["Severe impact detected", "Profuse bleeding"]}
    r=random.choice(residents); t=random.choice(types)
    sev = random.choices(["info", "warning", "critical", "emergency"], weights=[30, 40, 20, 10])[0]
    return {"resident_name":r["name"],"room_number":r["room"],"floor":r["floor"],
            "episode_type":t,"severity":sev,
            "trend":random.choice(["worsening","stable","improving"]),
            "alarms":random.sample(alarm_map[t],k=min(2,len(alarm_map[t])))}

@app.get("/predictive/alerts")
def get_predictive_alerts():
    residents = ["Mr. Abraham", "Mrs. Lindstrom", "Mr. Sato", "Mrs. Kowalski"]
    risks = ["High Fall Probability", "Cardiac Irregularity", "Early Respiratory Distress", "Potential Wandering Episode"]
    indices = random.sample(range(len(residents)), k=2)
    return [
        {
            "resident": residents[i],
            "risk": risks[i],
            "confidence": random.randint(78, 96),
            "vitals": {
                "hr": random.randint(95, 120) if "Cardiac" in risks[i] else random.randint(70, 85),
                "ox": random.randint(88, 92) if "Respiratory" in risks[i] else random.randint(96, 99),
                "mobility": random.randint(10, 30) if "Fall" in risks[i] else random.randint(70, 90)
            },
            "eta_to_incident": f"{random.randint(15, 120)}m"
        } for i in indices
    ]

@app.post("/report/generate")
def generate_report(req: ReportRequest):
    report_text = ai_generate_report(req)
    # Save report to history
    for ep in EPISODE_HISTORY:
        if ep["id"] == req.episode_id:
            ep["final_report"] = report_text
            save_db()
            break
    return {"success": True, "report": report_text}

@app.get("/shift/summary")
def shift_summary():
    sh = current_shift_hour(); sp = get_system_pressure()
    fp = [predict_fatigue(cg,shift_hour=sh, system_pressure=sp) for cg in CAREGIVERS]
    return {"total_caregivers":len(CAREGIVERS),
            "available_now":sum(1 for cg in CAREGIVERS if cg["status"]=="available"),
            "burnout_flagged":sum(1 for cg in CAREGIVERS if cg["burnout_flag"]),
            "high_fatigue_count":sum(1 for f in fp if f["fatigue_level"] in ["High","Critical"]),
            "avg_shift_fatigue":round(sum(f["fatigue_score"] for f in fp)/len(fp),1) if fp else 0,
            "total_assignments_today":sum(cg["assignments_today"] for cg in CAREGIVERS),
            "open_episodes":len([e for e in EPISODE_HISTORY if e.get("status")=="open"]),
            "shift_hour":sh}
