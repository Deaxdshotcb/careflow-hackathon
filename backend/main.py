from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import requests, os, random, time, datetime
from dotenv import load_dotenv
from fatigue_model import predict_fatigue, get_feature_importance, simulate_fatigue_trend

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

app = FastAPI(title="CareFlow API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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

CAREGIVERS = [
    {"id":"cg1","name":"Maria John","role":"nurse","floor":2,"status":"available",
     "active_tasks":2,"active_episodes":0,"skills":["cardiac","fall","medication"],
     "assignments_today":3,"eta_minutes":0,"last_assigned_mins_ago":45,"burnout_flag":False},
    {"id":"cg2","name":"Ravi Kumar","role":"caregiver","floor":1,"status":"attending",
     "active_tasks":4,"active_episodes":1,"skills":["fall","dementia"],
     "assignments_today":6,"eta_minutes":8,"last_assigned_mins_ago":5,"burnout_flag":False},
    {"id":"cg3","name":"Priya Nair","role":"nurse","floor":3,"status":"rounds",
     "active_tasks":3,"active_episodes":1,"skills":["cardiac","respiratory"],
     "assignments_today":5,"eta_minutes":12,"last_assigned_mins_ago":20,"burnout_flag":False},
    {"id":"cg4","name":"James Okafor","role":"caregiver","floor":2,"status":"available",
     "active_tasks":1,"active_episodes":0,"skills":["dementia","fall"],
     "assignments_today":2,"eta_minutes":0,"last_assigned_mins_ago":90,"burnout_flag":False},
    {"id":"cg5","name":"Sunita Das","role":"nurse","floor":1,"status":"break",
     "active_tasks":0,"active_episodes":0,"skills":["cardiac","medication","respiratory"],
     "assignments_today":7,"eta_minutes":15,"last_assigned_mins_ago":30,"burnout_flag":True},
    {"id":"cg6","name":"Tom Varghese","role":"caregiver","floor":2,"status":"available",
     "active_tasks":5,"active_episodes":2,"skills":["fall","dementia"],
     "assignments_today":8,"eta_minutes":0,"last_assigned_mins_ago":10,"burnout_flag":True},
]

EPISODE_HISTORY = []
SHIFT_START_HOUR = datetime.datetime.now().hour

def current_shift_hour():
    return max(0, min(12, datetime.datetime.now().hour - SHIFT_START_HOUR))

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

def compute_score(cg, ep: AlarmEpisode, fatigue_info: dict):
    crit = ep.severity == "critical"
    w = {"workload":0.20 if crit else 0.25,"status":0.25 if crit else 0.20,
         "proximity":0.25 if crit else 0.20,"skill":0.15,
         "eta":0.10 if crit else 0.12,"fairness":0.05 if crit else 0.08}
    b = {"workload":round(score_workload(cg),2),"status":STATUS_SCORE.get(cg["status"],0),
         "proximity":round(score_proximity(cg["floor"],ep.floor),2),
         "skill":score_skill(cg,ep.episode_type),"eta":round(score_eta(cg),2),
         "fairness":round(score_fairness(cg),2)}
    raw = sum(w[k]*b[k] for k in w)
    raw *= fatigue_info.get("dispatch_penalty", 1.0)   # ML fatigue penalty
    return round(raw*100,1), b

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

# ── ROUTES ───────────────────────────────────────────────────────────────────
@app.get("/")
def root(): return {"message": "CareFlow API running — ML Fatigue Model active!"}

@app.get("/caregivers")
def get_caregivers():
    sh = current_shift_hour()
    return [{**cg, "fatigue": predict_fatigue(cg, shift_hour=sh)} for cg in CAREGIVERS]

@app.post("/recommend")
def recommend(episode: AlarmEpisode):
    sh = current_shift_hour()
    scored = []
    for cg in CAREGIVERS:
        fatigue = predict_fatigue(cg, shift_hour=sh)
        score, breakdown = compute_score(cg, episode, fatigue)
        scored.append({"caregiver":cg,"score":score,"breakdown":breakdown,
                       "predicted_eta_minutes":predict_arrival(cg,episode),"fatigue":fatigue})
    scored.sort(key=lambda x: x["score"], reverse=True)

    results = []
    for i, item in enumerate(scored[:3]):
        explanation = ai_explain(item["caregiver"],item["score"],item["breakdown"],
                                 episode, i+1, item["fatigue"])
        results.append({"rank":["primary","secondary","backup"][i],
                        "caregiver":item["caregiver"],"score":item["score"],
                        "breakdown":item["breakdown"],
                        "predicted_eta_minutes":item["predicted_eta_minutes"],
                        "fatigue":item["fatigue"],"explanation":explanation})

    EPISODE_HISTORY.append({"id":f"EP{int(time.time())}","resident":episode.resident_name,
        "type":episode.episode_type,"severity":episode.severity,
        "recommended":scored[0]["caregiver"]["name"],
        "recommended_fatigue":scored[0]["fatigue"]["fatigue_score"],
        "timestamp":time.time(),"status":"open","alarms":episode.alarms})

    return {"episode":episode.dict(),"recommendations":results,
            "all_scores":[{"name":s["caregiver"]["name"],"score":s["score"],
                           "fatigue_score":s["fatigue"]["fatigue_score"],
                           "fatigue_level":s["fatigue"]["fatigue_level"]} for s in scored]}

@app.post("/assign")
def assign(req: AssignRequest):
    for cg in CAREGIVERS:
        if cg["id"] == req.caregiver_id:
            cg["active_episodes"] += 1; cg["active_tasks"] += 1
            cg["assignments_today"] += 1; cg["last_assigned_mins_ago"] = 0
            if cg["status"] == "available": cg["status"] = "attending"
            fatigue = predict_fatigue(cg, shift_hour=current_shift_hour())
            cg["burnout_flag"] = fatigue["fatigue_level"] in ["High","Critical"]
            return {"success":True,"message":f"{cg['name']} assigned to {req.resident_name}",
                    "updated_fatigue":fatigue}
    raise HTTPException(status_code=404, detail="Caregiver not found")

@app.get("/fatigue/all")
def fatigue_all():
    sh = current_shift_hour()
    return {"shift_hour":sh,
            "predictions":[{"caregiver_id":cg["id"],"name":cg["name"],
                            **predict_fatigue(cg,shift_hour=sh)} for cg in CAREGIVERS],
            "feature_importance":get_feature_importance()}

@app.get("/fatigue/{caregiver_id}")
def fatigue_single(caregiver_id: str):
    cg = next((c for c in CAREGIVERS if c["id"]==caregiver_id), None)
    if not cg: raise HTTPException(status_code=404, detail="Caregiver not found")
    return {"caregiver":cg,"fatigue":predict_fatigue(cg,shift_hour=current_shift_hour()),
            "shift_trend":simulate_fatigue_trend(cg),"feature_importance":get_feature_importance()}

@app.get("/episodes/history")
def get_history(): return EPISODE_HISTORY[-20:]

@app.post("/simulate")
def simulate_alarm():
    residents = [{"name":"Mr. George","room":101,"floor":1},{"name":"Mrs. Patel","room":205,"floor":2},
                 {"name":"Mr. Thomas","room":312,"floor":3},{"name":"Mrs. Nair","room":108,"floor":1}]
    types = ["cardiac","fall","wandering","respiratory","medication"]
    alarm_map = {"cardiac":["Heart rate spike","BP increase","HRV abnormal"],
                 "fall":["Motion sensor triggered","No movement detected","SOS pressed"],
                 "respiratory":["SpO2 drop","Breathing irregular"],
                 "wandering":["Geofence breach","Door sensor triggered"],
                 "medication":["Missed dose alert","Medication overdue"]}
    r=random.choice(residents); t=random.choice(types)
    return {"resident_name":r["name"],"room_number":r["room"],"floor":r["floor"],
            "episode_type":t,"severity":random.choice(["critical","warning","info"]),
            "trend":random.choice(["worsening","stable","improving"]),
            "alarms":random.sample(alarm_map[t],k=min(2,len(alarm_map[t])))}

@app.get("/shift/summary")
def shift_summary():
    sh = current_shift_hour()
    fp = [predict_fatigue(cg,shift_hour=sh) for cg in CAREGIVERS]
    return {"total_caregivers":len(CAREGIVERS),
            "available_now":sum(1 for cg in CAREGIVERS if cg["status"]=="available"),
            "burnout_flagged":sum(1 for cg in CAREGIVERS if cg["burnout_flag"]),
            "high_fatigue_count":sum(1 for f in fp if f["fatigue_level"] in ["High","Critical"]),
            "avg_shift_fatigue":round(sum(f["fatigue_score"] for f in fp)/len(fp),1),
            "total_assignments_today":sum(cg["assignments_today"] for cg in CAREGIVERS),
            "open_episodes":len([e for e in EPISODE_HISTORY if e.get("status")=="open"]),
            "shift_hour":sh}
