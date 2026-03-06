# 🏥 CareFlow — 24-Hour Hackathon Guide
### AI-Driven Intelligent Caregiver Workload Optimization Engine

---

## 🎯 What We're Building

**CareFlow** is a real-time AI dispatch engine that:
- Watches for health alarm episodes in an elderly care home
- Scores every on-shift caregiver across 6 signals (workload, proximity, skill, availability, ETA, fairness)
- Recommends the best caregiver with an AI-generated plain-English explanation
- Prevents caregiver burnout by tracking shift-level stress
- Groups related alarms into "episodes" for smarter decision-making

**Free tools used:** Python, FastAPI, React, Groq AI (free), GitHub — no paid APIs!

---

## 👥 Team Roles (6 Members)

| Member | Role | What You Do |
|--------|------|-------------|
| **Person 1** | Team Lead + Backend | Sets up GitHub, runs backend, coordinates |
| **Person 2** | Backend (Scoring Engine) | Works on main.py scoring logic |
| **Person 3** | Frontend Lead | Builds the React dashboard |
| **Person 4** | Frontend (UI Polish) | Styling, components, testing |
| **Person 5** | AI Integration | Groq API setup, explanation tuning |
| **Person 6** | Docs + Presentation | README, slides, demo script |

---

## ⏰ 24-Hour Timeline

| Time | Task | Who |
|------|------|-----|
| 0:00 – 1:00 | GitHub setup, installations, team briefing | All |
| 1:00 – 3:00 | Backend running + scoring engine tested | P1, P2 |
| 1:00 – 3:00 | Frontend scaffold + basic layout | P3, P4 |
| 3:00 – 5:00 | Groq AI explanation connected | P5 |
| 3:00 – 6:00 | Dispatch UI working end-to-end | P3, P4 |
| 6:00 – 10:00 | All 3 tabs (Dispatch, Caregivers, History) working | P3, P4 |
| 10:00 – 14:00 | Simulation mode + burnout flag UI | P2, P3 |
| 14:00 – 18:00 | Polish, edge cases, demo data | All |
| 18:00 – 22:00 | Presentation slides, README, demo script | P6 |
| 22:00 – 24:00 | Final rehearsal + backup plan | All |

---

## 🚀 STEP-BY-STEP SETUP (Read This Carefully!)

### STEP 0 — Install Required Software (Do This First!)

Every team member needs these installed on their laptop:

**A) Install Git**
- Go to https://git-scm.com/downloads
- Download and install for your OS
- Restart your computer after installing

**B) Install Python**
- Go to https://www.python.org/downloads/
- Download Python 3.11 or higher
- ✅ IMPORTANT: During install, check the box that says "Add Python to PATH"
- Restart your computer after installing

**C) Install Node.js**
- Go to https://nodejs.org/
- Download the LTS version (green button)
- Install it normally
- Restart your computer after installing

**D) Install VS Code (Code Editor)**
- Go to https://code.visualstudio.com/
- Download and install
- Open VS Code, go to Extensions (left sidebar), install "Python" and "ES7 React" extensions

**To verify everything is installed, open Terminal (Mac/Linux) or Command Prompt (Windows) and type:**
```
python --version        → should show Python 3.11.x
node --version          → should show v18.x or higher
npm --version           → should show 9.x or higher
git --version           → should show git version 2.x
```

---

### STEP 1 — GitHub Setup (Person 1 Does This)

**Person 1 only:**

1. Go to https://github.com and sign in (or create a free account)
2. Click the **+** button top right → **New repository**
3. Name it: `careflow-hackathon`
4. Set to **Public**
5. Click **Create repository**
6. Copy the repository URL (looks like: `https://github.com/yourname/careflow-hackathon.git`)

Now upload the project:
```bash
# Open Terminal/Command Prompt
# Navigate to where the careflow folder is
cd careflow

# Initialize git
git init
git add .
git commit -m "Initial CareFlow setup"
git branch -M main
git remote add origin https://github.com/YOURNAME/careflow-hackathon.git
git push -u origin main
```

**Person 1 — Invite your team:**
1. Go to your GitHub repo
2. Click **Settings** → **Collaborators**
3. Click **Add people**
4. Add each team member's GitHub username

**Everyone else (Persons 2-6):**
1. Accept the GitHub invitation (check your email)
2. Open Terminal/Command Prompt
3. Clone the project:
```bash
git clone https://github.com/YOURNAME/careflow-hackathon.git
cd careflow-hackathon
```

---

### STEP 2 — Get Your Free Groq API Key (Person 5 Does This, Shares With Team)

1. Go to https://console.groq.com
2. Click **Sign Up** (free, takes 30 seconds)
3. After login, click **API Keys** in the left sidebar
4. Click **Create API Key**
5. Copy the key (starts with `gsk_...`)
6. Open the file `backend/.env` and replace `your_groq_api_key_here` with your key:
```
GROQ_API_KEY=gsk_your_actual_key_here
```
7. Share this key with Person 1 via WhatsApp/Slack

> ℹ️ Groq's free tier gives you ~14,400 requests/day with llama3-8b-8192 — more than enough for the hackathon!

---

### STEP 3 — Start the Backend (Person 1 & 2)

Open Terminal/Command Prompt:

```bash
# Go into backend folder
cd careflow/backend

# Create a virtual environment (keeps your Python packages organized)
python -m venv venv

# Activate it:
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install all required packages
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

✅ Backend is running! Test it by opening http://localhost:8000 in your browser — you should see:
```json
{"message": "CareFlow API running!"}
```

Also check http://localhost:8000/docs — this is the automatic API documentation page. You can test all endpoints here!

---

### STEP 4 — Start the Frontend (Person 3 & 4)

Open a **new** Terminal/Command Prompt (keep the backend one open!):

```bash
# Go into frontend folder
cd careflow/frontend

# Install packages (this takes 1-2 minutes first time)
npm install

# Start the frontend
npm run dev
```

You should see:
```
VITE v5.x  ready in 500ms
➜  Local:   http://localhost:3000/
```

Open http://localhost:3000 in your browser — you should see the CareFlow dashboard!

---

### STEP 5 — Test Everything Works

1. Open the dashboard at http://localhost:3000
2. Click the **🎲 Simulate** button to load a random alarm episode
3. Click **🔍 Find Best Caregiver**
4. You should see 3 caregiver recommendations with scores and AI explanations!
5. Click **✅ Dispatch** on the primary recommendation
6. Go to the **History** tab — you should see the episode logged

If something is not working, check that both terminals (backend and frontend) are running without errors.

---

### STEP 6 — Working on the Code as a Team

Every time you start working:
```bash
# Pull latest changes from teammates
git pull origin main
```

Every time you finish a change:
```bash
# Save your changes
git add .
git commit -m "describe what you changed"
git push origin main
```

**IMPORTANT — Never push to main at the same time.** Coordinate with your team: "I'm pushing now, wait 2 minutes."

---

## 🧠 Understanding the Scoring System

The engine scores each caregiver out of 100% using 6 signals:

| Signal | Normal Weight | Critical Weight | What It Measures |
|--------|--------------|-----------------|------------------|
| Workload | 25% | 20% | Fewer active tasks = higher score |
| Status | 20% | 25% | Available=100%, Break=20%, Out=0% |
| Proximity | 20% | 25% | Same floor = full points |
| Skill Match | 15% | 15% | Has training for this episode type |
| ETA | 12% | 10% | Time until they're free (lower = better) |
| Fairness | 8% | 5% | Too many assignments today = penalized |

**Burnout Penalty:** If a caregiver is flagged for burnout (7+ assignments), their score is multiplied by 0.55 regardless of other factors.

**For CRITICAL episodes:** Proximity and Status weights increase because speed matters most.

---

## ✨ Novelty Features (Talk About These in Presentation!)

1. **Episode Grouping** — Multiple alarms within 10 minutes for the same resident are grouped into one "episode" instead of generating separate alerts. This prevents alert fatigue.

2. **Burnout Prevention** — The system tracks assignments across the entire shift and automatically flags caregivers with 7+ assignments as "Burnout Risk," deprioritizing them by 45% even if they're free.

3. **Dynamic Weight Shifting** — The scoring weights change automatically based on episode severity. Critical episodes prioritize speed (proximity + availability); lower severity prioritizes fairness and workload balance.

4. **AI-Generated Plain-English Explanations** — Uses Groq's free Llama3 model to write a human-readable explanation for each recommendation, not just a number. Staff can understand and trust the decision.

5. **Predicted Response Time** — Estimates arrival time using ETA + floor travel time (2 min/floor), giving coordinators a concrete expectation.

6. **Simulation Mode** — One-click random episode generator for demos and testing without needing real sensor data.

---

## 📊 Demo Script (For Judges — 3 Minutes)

**Person 6 presents this:**

**[0:00 – 0:30]** Show the dashboard. Point out the header stats: available caregivers, burnout flags, total assignments.

**[0:30 – 1:00]** Click 🎲 Simulate. Say: *"This simulates a real alarm episode firing — in a real system, this comes from wearable sensors."*

**[1:00 – 1:45]** Click Find Best Caregiver. Say: *"CareFlow instantly scores all 6 on-shift caregivers across workload, proximity, skill, fairness, and burnout risk. Watch the scores appear."*

**[1:45 – 2:15]** Point to the AI explanation box. Say: *"Instead of just a number, our engine uses free AI to explain the recommendation in plain English — so nurses trust and understand the decision."*

**[2:15 – 2:40]** Click Dispatch. Go to History tab. Say: *"The assignment is logged, workload updates in real time, and the next episode gets fresh scores."*

**[2:40 – 3:00]** Go to Caregivers tab. Point to burnout flags. Say: *"CareFlow tracks cumulative stress across the shift — flagged caregivers are automatically deprioritized to prevent burnout."*

---

## 🆘 Troubleshooting

| Problem | Fix |
|---------|-----|
| `python not found` | Reinstall Python, check "Add to PATH" during install |
| `npm not found` | Reinstall Node.js and restart terminal |
| `uvicorn not found` | Make sure virtual environment is activated |
| Frontend shows blank | Check backend is running on port 8000 |
| No AI explanations | Check your Groq API key in backend/.env |
| CORS error in browser | Make sure backend is running, check port 8000 |
| `git push` rejected | Run `git pull origin main` first, then push again |

---

## 📁 Project Structure

```
careflow/
├── backend/
│   ├── main.py          ← All backend logic (scoring + API)
│   ├── requirements.txt ← Python packages needed
│   └── .env             ← Your Groq API key (never push this to GitHub!)
├── frontend/
│   ├── src/
│   │   ├── App.jsx      ← Main dashboard UI
│   │   ├── main.jsx     ← React entry point
│   │   └── index.css    ← Tailwind CSS
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── GUIDE.md             ← This file
```

---

## 🔒 Important — Don't Push Your API Key!

Add this to a file called `.gitignore` in the backend folder:
```
.env
venv/
__pycache__/
```

Then run:
```bash
git add .gitignore
git commit -m "Add gitignore to protect API key"
git push
```

---

## 📝 Presentation Talking Points

- **Problem:** Caregiver dispatch in elderly care is currently manual, slow, and unfair
- **Solution:** CareFlow uses 6-signal weighted AI scoring with real-time explainability
- **Novelty:** Burnout prevention + episode grouping + dynamic severity weights + AI explanations
- **Tech:** Python FastAPI + React + Groq Llama3 (all free)
- **Impact:** Faster response times, fairer workload distribution, reduced staff burnout
- **Scalability:** Can connect to real wearable sensor APIs, hospital management systems

Good luck! 🚀
