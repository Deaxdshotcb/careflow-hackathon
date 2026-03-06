import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const SEVERITY_COLOR = {
  critical: { bg: "bg-red-50",    border: "border-red-500",    badge: "bg-red-500",    text: "text-red-700" },
  warning:  { bg: "bg-yellow-50", border: "border-yellow-500", badge: "bg-yellow-400", text: "text-yellow-700" },
  info:     { bg: "bg-blue-50",   border: "border-blue-400",   badge: "bg-blue-400",   text: "text-blue-700" },
};

const STATUS_COLOR = {
  available: "bg-green-100 text-green-800",
  attending: "bg-blue-100 text-blue-800",
  rounds:    "bg-purple-100 text-purple-800",
  break:     "bg-gray-100 text-gray-500",
  out:       "bg-red-100 text-red-800",
};

const FATIGUE_COLOR = {
  Low:      { bg: "bg-green-100",  text: "text-green-800",  bar: "#22c55e", badge: "bg-green-500" },
  Moderate: { bg: "bg-yellow-100", text: "text-yellow-800", bar: "#f59e0b", badge: "bg-yellow-500" },
  High:     { bg: "bg-red-100",    text: "text-red-800",    bar: "#ef4444", badge: "bg-red-500" },
  Critical: { bg: "bg-purple-100", text: "text-purple-800", bar: "#7c3aed", badge: "bg-purple-600" },
};

const RANK_STYLES = {
  primary:   { border: "border-indigo-500", badge: "bg-indigo-500", label: "⭐ Primary" },
  secondary: { border: "border-blue-400",   badge: "bg-blue-400",   label: "2nd Choice" },
  backup:    { border: "border-gray-400",   badge: "bg-gray-400",   label: "Backup" },
};

// ── Mini bar component ───────────────────────────────────────────────────────
function Bar({ label, value, color = "#6366f1" }) {
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span className="capitalize">{label}</span>
        <span>{typeof value === "number" && value <= 1 ? `${Math.round(value * 100)}%` : `${value}`}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${typeof value === "number" && value <= 1 ? value * 100 : value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Simple SVG line chart for fatigue trend ──────────────────────────────────
function TrendChart({ trend }) {
  if (!trend || trend.length === 0) return null;
  const W = 320, H = 100, PAD = 20;
  const maxScore = 100;
  const pts = trend.map((t, i) => ({
    x: PAD + (i / (trend.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - t.fatigue_score / maxScore) * (H - PAD * 2),
    score: t.fatigue_score,
    hour: t.hour,
    level: t.fatigue_level,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const areaPath = `M ${pts[0].x},${H - PAD} ` + pts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${pts[pts.length-1].x},${H-PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
      <defs>
        <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill="url(#fatigueGrad)" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
      {/* Dots */}
      {pts.filter((_, i) => i % 2 === 0).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />
      ))}
      {/* Hour labels */}
      {pts.filter((_, i) => i % 3 === 0).map((p, i) => (
        <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">
          h{p.hour}
        </text>
      ))}
    </svg>
  );
}

// ── Fatigue badge ────────────────────────────────────────────────────────────
function FatigueBadge({ level, score }) {
  const c = FATIGUE_COLOR[level] || FATIGUE_COLOR.Low;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      🧠 {level} · {score}/100
    </span>
  );
}

// ── Caregiver card (dispatch tab) ────────────────────────────────────────────
function CaregiverCard({ cg }) {
  const fc = FATIGUE_COLOR[cg.fatigue?.fatigue_level] || FATIGUE_COLOR.Low;
  return (
    <div className={`rounded-xl border-2 p-4 bg-white shadow-sm ${cg.burnout_flag ? "border-red-300" : "border-gray-200"}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-gray-800 text-sm">{cg.name}</p>
          <p className="text-xs text-gray-500 capitalize">{cg.role} · Floor {cg.floor}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[cg.status]}`}>
          {cg.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mt-2">
        <span>📋 Tasks: <b>{cg.active_tasks}</b></span>
        <span>🚨 Episodes: <b>{cg.active_episodes}</b></span>
        <span>📅 Today: <b>{cg.assignments_today}</b></span>
        <span>⏱ ETA: <b>{cg.eta_minutes} min</b></span>
      </div>
      {cg.fatigue && (
        <div className={`mt-2 px-2 py-1.5 rounded-lg ${fc.bg}`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-bold ${fc.text}`}>🧠 ML Fatigue: {cg.fatigue.fatigue_level}</span>
            <span className={`text-xs font-black ${fc.text}`}>{cg.fatigue.fatigue_score}/100</span>
          </div>
          <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${cg.fatigue.fatigue_score}%`, backgroundColor: cg.fatigue.fatigue_color }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{cg.fatigue.recommendation}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        {cg.skills.map(s => (
          <span key={s} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full">{s}</span>
        ))}
      </div>
    </div>
  );
}

// ── Recommendation card ──────────────────────────────────────────────────────
function RecommendationCard({ rec, onAssign, loading }) {
  const style = RANK_STYLES[rec.rank];
  const cg = rec.caregiver;
  const fc = FATIGUE_COLOR[rec.fatigue?.fatigue_level] || FATIGUE_COLOR.Low;
  return (
    <div className={`rounded-xl border-2 ${style.border} bg-white shadow-md p-5 relative`}>
      <span className={`absolute top-3 right-3 text-xs text-white px-2 py-0.5 rounded-full ${style.badge}`}>
        {style.label}
      </span>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
          {cg.name[0]}
        </div>
        <div>
          <p className="font-bold text-gray-800">{cg.name}</p>
          <p className="text-xs text-gray-500 capitalize">{cg.role} · Floor {cg.floor}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-black text-indigo-600">{rec.score}%</p>
          <p className="text-xs text-gray-400">Dispatch Score</p>
        </div>
      </div>

      {/* Dispatch score breakdown */}
      <div className="mb-3">
        {Object.entries(rec.breakdown).map(([k, v]) => (
          <Bar key={k} label={k} value={v}
            color={v >= 0.7 ? "#22c55e" : v >= 0.4 ? "#f59e0b" : "#ef4444"} />
        ))}
      </div>

      {/* ML Fatigue panel */}
      {rec.fatigue && (
        <div className={`rounded-lg p-3 mb-3 ${fc.bg}`}>
          <div className="flex justify-between items-center mb-1.5">
            <p className={`text-xs font-bold ${fc.text}`}>🧠 ML Fatigue Prediction</p>
            <span className={`text-xs font-black ${fc.text}`}>{rec.fatigue.fatigue_score}/100 · {rec.fatigue.fatigue_level}</span>
          </div>
          <div className="w-full bg-white bg-opacity-60 rounded-full h-2 mb-1.5">
            <div className="h-2 rounded-full transition-all duration-700"
              style={{ width:`${rec.fatigue.fatigue_score}%`, backgroundColor: rec.fatigue.fatigue_color }} />
          </div>
          <p className={`text-xs ${fc.text}`}>{rec.fatigue.recommendation}</p>
          <p className="text-xs text-gray-500 mt-1">Dispatch penalty: ×{rec.fatigue.dispatch_penalty}</p>
        </div>
      )}

      {/* ETA + status */}
      <div className="flex gap-2 text-xs text-gray-600 mb-3 flex-wrap">
        <span className="bg-gray-100 px-2 py-1 rounded-lg">⏱ ETA: <b>{rec.predicted_eta_minutes} min</b></span>
        <span className={`px-2 py-1 rounded-lg ${STATUS_COLOR[cg.status]}`}>{cg.status}</span>
      </div>

      {/* AI reasoning */}
      <div className="bg-indigo-50 rounded-lg p-3 mb-3">
        <p className="text-xs font-semibold text-indigo-700 mb-1">🤖 AI Reasoning</p>
        <p className="text-xs text-gray-700 leading-relaxed">{rec.explanation}</p>
      </div>

      {rec.rank === "primary" && (
        <button onClick={() => onAssign(cg.id, cg.name)} disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 rounded-lg transition disabled:opacity-50">
          {loading ? "Assigning..." : `✅ Dispatch ${cg.name}`}
        </button>
      )}
    </div>
  );
}

// ── Fatigue Intelligence Tab ─────────────────────────────────────────────────
function FatigueTab() {
  const [fatigueData, setFatigueData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/fatigue/all`)
      .then(r => r.json())
      .then(d => { setFatigueData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selectCaregiver = async (id) => {
    setSelected(id);
    setDetail(null);
    const res = await fetch(`${API}/fatigue/${id}`);
    const d = await res.json();
    setDetail(d);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading ML predictions…</p>
      </div>
    </div>
  );

  if (!fatigueData) return <p className="text-gray-400 text-sm p-4">Could not load fatigue data. Is the backend running?</p>;

  const sorted = [...fatigueData.predictions].sort((a, b) => b.fatigue_score - a.fatigue_score);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Left: All caregivers ranked by fatigue */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-1">Fatigue Rankings</h3>
          <p className="text-xs text-gray-400 mb-4">Shift hour {fatigueData.shift_hour} · ML model active</p>
          <div className="space-y-3">
            {sorted.map(pred => {
              const fc = FATIGUE_COLOR[pred.fatigue_level] || FATIGUE_COLOR.Low;
              return (
                <button key={pred.caregiver_id} onClick={() => selectCaregiver(pred.caregiver_id)}
                  className={`w-full text-left rounded-xl p-3 border-2 transition ${selected === pred.caregiver_id ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm text-gray-800">{pred.name}</span>
                    <FatigueBadge level={pred.fatigue_level} score={pred.fatigue_score} />
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-700"
                      style={{ width:`${pred.fatigue_score}%`, backgroundColor: pred.fatigue_color }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{pred.recommendation}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature importance */}
        {fatigueData.feature_importance && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mt-4">
            <h3 className="font-bold text-gray-800 mb-1">What Drives Fatigue?</h3>
            <p className="text-xs text-gray-400 mb-3">ML model feature importance</p>
            {fatigueData.feature_importance.slice(0, 6).map(f => (
              <Bar key={f.feature} label={f.feature.replace(/_/g, " ")} value={f.importance / 100} color="#6366f1" />
            ))}
          </div>
        )}
      </div>

      {/* Right: Detail view */}
      <div className="lg:col-span-2">
        {!selected && (
          <div className="h-full flex items-center justify-center text-gray-400 py-20 text-center">
            <div>
              <p className="text-5xl mb-3">🧠</p>
              <p className="text-lg font-medium">Select a caregiver</p>
              <p className="text-sm mt-1">See their 12-hour fatigue trend and full breakdown</p>
            </div>
          </div>
        )}
        {selected && !detail && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
        {detail && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-2xl">
                  {detail.caregiver.name[0]}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-lg">{detail.caregiver.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{detail.caregiver.role} · Floor {detail.caregiver.floor} · {detail.caregiver.status}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-3xl font-black" style={{ color: detail.fatigue.fatigue_color }}>
                    {detail.fatigue.fatigue_score}
                  </p>
                  <p className="text-xs text-gray-400">/ 100 fatigue</p>
                </div>
              </div>

              {/* Fatigue level pill */}
              <div className={`rounded-xl p-3 mb-4 ${FATIGUE_COLOR[detail.fatigue.fatigue_level]?.bg}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bold text-sm ${FATIGUE_COLOR[detail.fatigue.fatigue_level]?.text}`}>
                    {detail.fatigue.fatigue_level} Fatigue
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${FATIGUE_COLOR[detail.fatigue.fatigue_level]?.badge}`}>
                    Penalty ×{detail.fatigue.dispatch_penalty}
                  </span>
                </div>
                <div className="w-full bg-white bg-opacity-60 rounded-full h-3 mb-2">
                  <div className="h-3 rounded-full transition-all duration-700"
                    style={{ width:`${detail.fatigue.fatigue_score}%`, backgroundColor: detail.fatigue.fatigue_color }} />
                </div>
                <p className={`text-sm font-medium ${FATIGUE_COLOR[detail.fatigue.fatigue_level]?.text}`}>
                  👉 {detail.fatigue.recommendation}
                </p>
              </div>

              {/* Feature values used by model */}
              <h4 className="font-bold text-gray-700 text-sm mb-2">Features Used by ML Model</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(detail.fatigue.feature_breakdown).map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500 capitalize">{k.replace(/_/g," ")}</p>
                    <p className="font-bold text-gray-800 text-sm">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 12-hour trend chart */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-1">Predicted 12-Hour Fatigue Trend</h4>
              <p className="text-xs text-gray-400 mb-3">How fatigue is projected to evolve through the shift</p>
              <TrendChart trend={detail.shift_trend} />
              <div className="flex gap-3 mt-3 flex-wrap">
                {detail.shift_trend.filter((_,i) => i%4===0).map(t => {
                  const fc = FATIGUE_COLOR[t.fatigue_level] || FATIGUE_COLOR.Low;
                  return (
                    <div key={t.hour} className={`rounded-lg px-2 py-1 ${fc.bg}`}>
                      <p className="text-xs font-bold" style={{color: fc.text.replace("text-","")?.replace("-800","")}}>
                        Hour {t.hour}
                      </p>
                      <p className={`text-xs ${fc.text}`}>{t.fatigue_score.toFixed(0)}/100</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feature importance for this model */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-3">Top Fatigue Drivers (Model-Wide)</h4>
              {detail.feature_importance.slice(0,6).map(f => (
                <Bar key={f.feature} label={f.feature.replace(/_/g," ")} value={f.importance/100} color="#6366f1"/>
              ))}
              <p className="text-xs text-gray-400 mt-3">
                Based on Gradient Boosting model trained on 2,000 synthetic shift records.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [caregivers, setCaregivers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    resident_name:"Mr. George", room_number:101, floor:1,
    episode_type:"cardiac", severity:"critical", trend:"worsening",
    alarms:["Heart rate spike","BP increase"],
  });
  const [recommendations, setRecommendations] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [allScores, setAllScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [tab, setTab] = useState("dispatch");
  const [toast, setToast] = useState("");

  const fetchData = async () => {
    try {
      const [cgRes, sumRes, histRes] = await Promise.all([
        fetch(`${API}/caregivers`), fetch(`${API}/shift/summary`), fetch(`${API}/episodes/history`)
      ]);
      setCaregivers(await cgRes.json());
      setSummary(await sumRes.json());
      setHistory(await histRes.json());
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleRecommend = async () => {
    setLoading(true); setRecommendations(null);
    try {
      const res = await fetch(`${API}/recommend`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({...form, room_number:Number(form.room_number), floor:Number(form.floor)}),
      });
      const data = await res.json();
      setRecommendations(data.recommendations);
      setEpisode(data.episode);
      setAllScores(data.all_scores);
    } catch(e) { showToast("❌ Could not reach backend. Is it running?"); }
    setLoading(false);
  };

  const handleSimulate = async () => {
    try {
      const res = await fetch(`${API}/simulate`, {method:"POST"});
      setForm({...await res.json(), alarms:[]});
      showToast("🎲 Random episode loaded!");
    } catch(e) { showToast("❌ Backend not reachable"); }
  };

  const handleAssign = async (cgId, cgName) => {
    setAssigning(true);
    try {
      await fetch(`${API}/assign`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({caregiver_id:cgId, resident_name:form.resident_name}),
      });
      showToast(`✅ ${cgName} dispatched to ${form.resident_name}!`);
      setRecommendations(null);
      fetchData();
    } catch(e) { showToast("❌ Assignment failed"); }
    setAssigning(false);
  };

  const tabs = [
    { id:"dispatch",  label:"🚨 Dispatch" },
    { id:"fatigue",   label:"🧠 Fatigue AI" },
    { id:"caregivers",label:"👥 Caregivers" },
    { id:"history",   label:"📋 History" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">C</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900">CareFlow</h1>
            <p className="text-xs text-gray-500">AI Caregiver Dispatch + ML Fatigue Engine</p>
          </div>
        </div>
        {summary && (
          <div className="flex gap-2 flex-wrap text-xs">
            <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium">
              🟢 {summary.available_now} Available
            </span>
            <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full font-medium">
              ⚠️ {summary.high_fatigue_count} High Fatigue
            </span>
            <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full font-medium">
              🧠 Avg Fatigue: {summary.avg_shift_fatigue}/100
            </span>
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-medium">
              📋 {summary.total_assignments_today} Assignments
            </span>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`mr-4 py-3 text-sm font-medium border-b-2 transition ${tab===t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6">

        {/* DISPATCH TAB */}
        {tab === "dispatch" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-800">New Alarm Episode</h2>
                  <button onClick={handleSimulate}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition">
                    🎲 Simulate
                  </button>
                </div>
                {[{label:"Resident Name",key:"resident_name",type:"text"},{label:"Room",key:"room_number",type:"number"},{label:"Floor",key:"floor",type:"number"}].map(({label,key,type})=>(
                  <div key={key} className="mb-3">
                    <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                    <input type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                ))}
                {[{label:"Episode Type",key:"episode_type",opts:["cardiac","fall","wandering","respiratory","medication"]},
                  {label:"Severity",key:"severity",opts:["critical","warning","info"]},
                  {label:"Trend",key:"trend",opts:["worsening","stable","improving"]}].map(({label,key,opts})=>(
                  <div key={key} className="mb-3">
                    <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                    <select value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                    </select>
                  </div>
                ))}
                <button onClick={handleRecommend} disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-60">
                  {loading ? "⏳ Analyzing + ML fatigue scoring..." : "🔍 Find Best Caregiver"}
                </button>
              </div>

              {allScores.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mt-4">
                  <h3 className="font-bold text-gray-800 text-sm mb-3">All Scores (with Fatigue)</h3>
                  {allScores.map(s => {
                    const fc = FATIGUE_COLOR[s.fatigue_level] || FATIGUE_COLOR.Low;
                    return (
                      <div key={s.name} className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                          <span>{s.name}</span>
                          <span className="flex gap-1 items-center">
                            <span>{s.score}%</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-white text-xs ${fc.badge}`}>{s.fatigue_level}</span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-indigo-500 transition-all duration-700"
                            style={{width:`${s.score}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {!recommendations && !loading && (
                <div className="h-full flex items-center justify-center text-center text-gray-400 py-20">
                  <div>
                    <p className="text-5xl mb-3">🏥</p>
                    <p className="text-lg font-medium">No active episode</p>
                    <p className="text-sm mt-1">Fill in alarm details or click 🎲 Simulate</p>
                    <p className="text-xs mt-2 text-indigo-400">ML fatigue model is live and scoring all caregivers</p>
                  </div>
                </div>
              )}
              {loading && (
                <div className="h-full flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Scoring caregivers + running ML fatigue model…</p>
                  </div>
                </div>
              )}
              {recommendations && (
                <div className="grid gap-4">
                  <h2 className="font-bold text-gray-800 text-lg">
                    Top Recommendations
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      for {episode?.resident_name} · {episode?.severity?.toUpperCase()} {episode?.episode_type}
                    </span>
                  </h2>
                  {recommendations.map(rec => (
                    <RecommendationCard key={rec.rank} rec={rec} onAssign={handleAssign} loading={assigning} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FATIGUE AI TAB */}
        {tab === "fatigue" && (
          <div>
            <div className="mb-5">
              <h2 className="font-bold text-gray-800 text-lg">🧠 ML Fatigue Intelligence</h2>
              <p className="text-sm text-gray-500">Gradient Boosting model predicts real-time caregiver fatigue from 10 shift signals</p>
            </div>
            <FatigueTab />
          </div>
        )}

        {/* CAREGIVERS TAB */}
        {tab === "caregivers" && (
          <div>
            <h2 className="font-bold text-gray-800 text-lg mb-4">On-Shift Caregivers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {caregivers.map(cg => <CaregiverCard key={cg.id} cg={cg} />)}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div>
            <h2 className="font-bold text-gray-800 text-lg mb-4">Episode History</h2>
            {history.length === 0 && <p className="text-gray-400 text-sm">No episodes yet. Run a dispatch to see history.</p>}
            <div className="space-y-3">
              {[...history].reverse().map((ep, i) => (
                <div key={i} className={`bg-white rounded-xl border-l-4 p-4 shadow-sm flex items-center gap-4
                  ${ep.severity==="critical"?"border-red-500":ep.severity==="warning"?"border-yellow-400":"border-blue-400"}`}>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{ep.resident} · <span className="capitalize">{ep.type}</span></p>
                    <p className="text-xs text-gray-500">Recommended: <b>{ep.recommended}</b>
                      {ep.recommended_fatigue !== undefined && (
                        <span className="ml-2 text-purple-500">· fatigue at dispatch: {ep.recommended_fatigue?.toFixed(1)}/100</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ep.alarms?.map(a=><span key={a} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{a}</span>)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize
                      ${ep.severity==="critical"?"bg-red-100 text-red-700":ep.severity==="warning"?"bg-yellow-100 text-yellow-700":"bg-blue-100 text-blue-700"}`}>
                      {ep.severity}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{new Date(ep.timestamp*1000).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
