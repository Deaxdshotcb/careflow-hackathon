import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import CaretakerDashboard from "./pages/CaretakerDashboard";
import FatigueTab from "./pages/FatigueTab";
import NeuralAvatar from "./components/NeuralAvatar";
import CaregiverCard from "./components/CaregiverCard";
import RecommendationCard from "./components/RecommendationCard";
import { API } from "./constants/api";
import { SEVERITY_COLOR, IMAGES } from "./constants/designTokens";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("careflow-user");
    return saved ? JSON.parse(saved) : null;
  });
  const [caregivers, setCaregivers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ resident_name: "Mr. Thomas", room_number: 302, floor: 3, episode_type: "cardiac", severity: "critical", trend: "worsening", alarms: [] });
  const [recommendations, setRecommendations] = useState(null);
  const [allScores, setAllScores] = useState([]);
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [tab, setTab] = useState(() => {
    return localStorage.getItem("careflow-tab") || "dispatch";
  });
  const [toast, setToast] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('careflow-dark') === 'true');
  const [showAddCg, setShowAddCg] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [newCg, setNewCg] = useState({
    name: "", role: "caregiver", floor: 1,
    active_tasks: 0, active_episodes: 0, assignments_today: 0,
    skills: "fall, dementia", photo_url: ""
  });
  const [predictiveAlerts, setPredictiveAlerts] = useState([]);

  // --- Session Persistence ---
  useEffect(() => {
    if (user) localStorage.setItem("careflow-user", JSON.stringify(user));
    else localStorage.removeItem("careflow-user");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("careflow-tab", tab);
  }, [tab]);

  const fetchData = async () => {
    try {
      const [cg, sum, hist, pred] = await Promise.all([
        fetch(`${API}/caregivers`), 
        fetch(`${API}/shift/summary`), 
        fetch(`${API}/episodes/history`),
        fetch(`${API}/predictive/alerts`)
      ]);
      setCaregivers(await cg.json()); 
      setSummary(await sum.json()); 
      setHistory(await hist.json());
      setPredictiveAlerts(await pred.json());
    } catch (e) { console.error("Sync Error", e); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('careflow-dark', 'true'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('careflow-dark', 'false'); }
  }, [darkMode]);

  // --- Periodic Data Sync (Admin) ---
  useEffect(() => {
    if (user?.role === 'admin') {
      const interval = setInterval(() => {
        if (!loading && !assigning) {
          fetchData();
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [user, loading, assigning]);

  // --- Auto-Simulation Loop ---
  useEffect(() => {
    if (user?.role === 'admin' && tab === 'dispatch' && !isPaused) {
      const interval = setInterval(() => {
        if (!loading && !recommendations) {
          handleSimulate(true);
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [user, tab, loading, recommendations, isPaused]);

  // --- Scanning Animation Logic ---
  useEffect(() => {
    if (loading && caregivers.length > 0) {
      const interval = setInterval(() => {
        setScanIndex(prev => (prev + 1) % caregivers.length);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [loading, caregivers]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  const handleLogin = async (username, password, role, onError) => {
    try {
      const resp = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role })
      });
      const data = await resp.json();
      if (data.success) {
        setUser(data.user);
        showToast(`Welcome, ${data.user.name}`);
      } else {
        if (onError) onError("Invalid credentials");
        showToast("Invalid credentials");
      }
    } catch (e) {
      if (onError) onError("Connection Error");
      showToast("Connection Error");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTab("dispatch");
    showToast("Logged out successfully");
  };

  const handleCreateCaregiver = async () => {
    if (!newCg.name) return showToast("Caregiver name required");
    try {
      const resp = await fetch(`${API}/caregivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCg,
          floor: Number(newCg.floor),
          active_tasks: Number(newCg.active_tasks),
          active_episodes: Number(newCg.active_episodes),
          assignments_today: Number(newCg.assignments_today),
          skills: newCg.skills.split(",").map(s => s.trim())
        })
      });
      if (resp.ok) {
        showToast("Caregiver added successfully");
        setShowAddCg(false);
        setNewCg({ name: "", role: "caregiver", floor: 1, active_tasks: 0, active_episodes: 0, assignments_today: 0, skills: "fall, dementia", photo_url: "" });
        fetchData();
      }
    } catch (e) { showToast("Error adding caregiver"); }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Purge all telemetry history?")) return;
    try {
      const resp = await fetch(`${API}/history/clear`, { method: "DELETE" });
      if (resp.ok) {
        showToast("Historical data purged");
        fetchData();
      }
    } catch (e) { showToast("Purge failed"); }
  };

  const handleRecommend = async (overrideForm = null) => {
    setLoading(true); setRecommendations(null);
    const targetForm = overrideForm || form;
    await new Promise(r => setTimeout(r, 4500));
    try {
      const resp = await fetch(`${API}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...targetForm, room_number: Number(targetForm.room_number), floor: Number(targetForm.floor) })
      });
      const data = await resp.json();
      if (data.success) {
        setRecommendations(data.recommendations);
        setEpisode(data.episode);
        setAllScores(data.all_scores);
        if (autoAssign && data.recommendations?.length > 0) {
          const top = data.recommendations[0].caregiver;
          showToast(`AUTO-MARK: Deployment Initiated for ${top.name}`);
          setTimeout(async () => {
            await handleAssign(top.id, top.name, targetForm);
          }, 5000);
        }
      } else {
        showToast(data.message || "No caregivers available");
        setRecommendations(null);
        setEpisode(null);
      }
    } catch (e) { showToast("Connection Error: Backend Offline"); }
    setLoading(false);
  };

  const handleDeleteCaregiver = async (id) => {
    try {
      const resp = await fetch(`${API}/caregivers/${id}`, { method: "DELETE" });
      if (resp.ok) {
        showToast("Caregiver removed from system");
        fetchData();
      }
    } catch (e) { showToast("Error deleting caregiver"); }
  };

  const handleSimulate = async (auto = false) => {
    const r = await fetch(`${API}/simulate`, { method: "POST" });
    const newForm = await r.json();
    setForm({ ...newForm, alarms: [] });
    if (auto) {
      handleRecommend(newForm);
    } else {
      showToast("Data Synced from Floor Sensors");
    }
  };

  const handleAssign = async (id, name, currentForm = null, explanation = null) => {
    setAssigning(true);
    const targetResident = currentForm?.resident_name || form.resident_name;
    const targetRoom = currentForm?.room_number || form.room_number;
    try {
      const resp = await fetch(`${API}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiver_id: id,
          resident_name: targetResident,
          ai_explanation: explanation
        })
      });
      const data = await resp.json();
      if (data.phone_notified) {
        showToast(`📲 SOS SENT: ${name} notified via Phone`);
      } else {
        showToast(`DISPATCHED: ${name} to Room ${targetRoom}`);
      }
      setRecommendations(null);
      fetchData();
    } catch (e) { showToast("Assignment Failure"); }
    setAssigning(false);
  };

  const handleEmergencyAlert = async (type) => {
    if (!episode?.id) return;
    if (episode.external_alerts?.some(a => a.type === type)) {
      showToast(`${type.toUpperCase()} already dispatched`);
      return;
    }
    alert(`[SYSTEM ALERT] Emergency services triggered: ${type.toUpperCase()}\nDispatching to Room ${form.room_number}...`);
    try {
      const resp = await fetch(`${API}/history/${episode.id}/alert?alert_type=${type}`, { method: "POST" });
      const data = await resp.json();
      if (data.success) {
        showToast(`${type.toUpperCase()} SIGNAL SENT`);
        setEpisode(prev => ({
          ...prev,
          external_alerts: [...(prev.external_alerts || []), { type, timestamp: Date.now() / 1000 }]
        }));
        fetchData();
      } else { showToast(data.message); }
    } catch (e) { showToast("Signal Failure"); }
  };

  const tabs = [
    { id: "dispatch", label: "Dispatch", icon: "" },
    { id: "live", label: "Live Operations", icon: "" },
    { id: "fatigue", label: "Fatigue Analysis", icon: "" },
    { id: "caregivers", label: "Caregivers", icon: "" },
    { id: "history", label: "History", icon: "" },
  ];

  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (user.role === 'caretaker') return <CaretakerDashboard user={user} onLogout={handleLogout} showToast={showToast} darkMode={darkMode} setDarkMode={setDarkMode} />;

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-700 selection:bg-indigo-500 selection:text-white relative overflow-hidden`}>
      <div className="fixed inset-0 neural-mesh pointer-events-none -z-10" />
      <div className="text-zinc-900 dark:text-zinc-100 min-h-screen relative">

        {toast && (
          <div className="fixed top-8 right-8 z-[100] bg-zinc-900 dark:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-8 py-5 rounded-[2rem] shadow-3xl animate-in slide-in-from-right-10 fade-in duration-500 border border-white/10 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {toast}
          </div>
        )}

        {/* --- Header --- */}
        <header className="fixed top-0 left-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-b border-zinc-200 dark:border-zinc-800/50 h-24 flex items-center px-12 justify-between">
          <div className="flex items-center gap-6 cursor-pointer group" onClick={() => setTab("dispatch")}>
            <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 rotate-3 transition-transform group-hover:rotate-0">
              <img src={IMAGES.logo} className="w-full h-full object-cover" alt="CareFlow Logo" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter leading-none text-indigo-600 dark:text-indigo-400">CareFlow</h1>
            </div>
          </div>

          <div className="flex items-center gap-12">
            {summary && (
              <div className="hidden xl:flex gap-10 items-center">
                {[
                  { l: "Available Staff", v: summary.available_now, c: "text-emerald-500", t: "caregivers" },
                  { l: "High Fatigue", v: summary.high_fatigue_count, c: "text-rose-500", t: "fatigue" },
                  { l: "Total Assignments", v: summary.total_assignments_today, c: "text-indigo-500", t: "history" }
                ].map(s => (
                  <button 
                    key={s.l} 
                    onClick={() => setTab(s.t)}
                    className="text-right hover:opacity-70 transition-opacity active:scale-95"
                  >
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1.5">{s.l}</p>
                    <p className={`text-2xl font-bold ${s.c} leading-none tracking-tighter`}>{s.v}</p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setDarkMode(!darkMode)} className="w-14 h-14 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-2xl transition-all shadow-lg active:scale-90 hover:shadow-indigo-500/10">
              {darkMode ? "🌙" : "☀️"}
            </button>
            <button onClick={handleLogout} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
              Sign Out
            </button>
          </div>
        </header>

        {/* --- Navigation --- */}
        <nav className="fixed top-24 left-0 w-full z-40 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-b border-zinc-200 dark:border-zinc-800/50 flex justify-center h-16 items-center px-12 gap-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-8 py-3 rounded-2xl transition-all duration-300 group ${
                tab === t.id
                  ? "bg-zinc-900 dark:bg-white/10 text-white shadow-lg"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              }`}
            >
              <span className="text-[13px] font-bold uppercase tracking-[0.2em] relative z-10 transition-colors">
                {t.label}
              </span>
            </button>
          ))}
        </nav>

        {/* --- Main --- */}
        <main className="pt-44 px-8 pb-24 max-w-[1700px] mx-auto">
          {tab === "dispatch" && (
            <div className="animate-in fade-in duration-1000">
              {episode?.severity === 'emergency' && (
                <div className="bg-rose-600 text-white p-6 rounded-[2rem] mb-12 flex items-center justify-between animate-pulse shadow-[0_0_50px_rgba(225,29,72,0.4)]">
                  <div className="flex items-center gap-6">
                    <span className="text-5xl">🚨</span>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Emergency Protocol Active</h3>
                      <p className="text-sm font-bold opacity-90 uppercase tracking-widest">Immediate intervention required for {episode.resident_name} in Room {episode.room_number}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {episode.external_alerts?.some(a => a.type === "Ambulance") ? (
                      <span className="bg-white/20 text-white font-black px-8 py-3 rounded-xl uppercase text-xs backdrop-blur-md border border-white/30">Ambulance Dispatched</span>
                    ) : (
                      <button onClick={() => handleEmergencyAlert("Ambulance")} className="bg-white text-rose-600 font-black px-8 py-3 rounded-xl uppercase text-xs hover:bg-zinc-100 transition-all shadow-2xl">Summon Help</button>
                    )}
                  </div>
                </div>
              )}

              {(!recommendations && !loading) && (
                <div className="relative h-[180px] rounded-[2.5rem] overflow-hidden mb-10 group shadow-xl border border-zinc-200 dark:border-zinc-800">
                  <img src={IMAGES.hero} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms] blur-[1px] brightness-[0.4]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent flex flex-col justify-center p-10">
                    <div className="max-w-xl">
                      <span className="inline-block bg-indigo-600 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-white shadow-xl">System Operational</span>
                      <h2 className="text-5xl font-bold text-white tracking-tightest leading-none mb-3">STAFF DISPATCH</h2>
                      <p className="text-[13px] text-zinc-400 font-semibold uppercase tracking-widest opacity-80">Neural Coordination Platform</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative">
                <div className="lg:col-span-4 lg:sticky lg:top-44 self-start space-y-8 pb-10">
                  <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-bold uppercase tracking-tighter flex items-center gap-3">
                        <span className={`w-3.5 h-3.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-indigo-500 animate-pulse-slow'}`} />
                        Dispatch Sensor
                      </h2>
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg border transition-all active:scale-95 ${isPaused ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}
                      >
                        {isPaused ? "▶ Auto" : "⏸ Pause"}
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2 px-1">Resident Name</label>
                        <input type="text" value={form.resident_name} onChange={e => setForm(p => ({ ...p, resident_name: e.target.value }))}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2 px-1">Room</label>
                          <input type="number" value={form.room_number} onChange={e => setForm(p => ({ ...p, room_number: e.target.value }))}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2 px-1">Floor</label>
                          <input type="number" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2 px-1">Type</label>
                          <select value={form.episode_type} onChange={e => setForm(p => ({ ...p, episode_type: e.target.value }))}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all outline-none">
                            {["cardiac", "fall", "respiratory", "wandering", "unconscious", "seizure", "trauma"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2 px-1">Priority</label>
                          <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
                            className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${form.severity === 'emergency' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-zinc-200 dark:border-zinc-800'} rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all outline-none`}>
                            {["emergency", "critical", "warning", "info"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <button
                          onClick={() => handleRecommend()}
                          disabled={loading}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl text-[13px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {loading ? "Analyzing..." : "🚀 Trigger Scan"}
                        </button>

                        <div className="flex items-center justify-between px-1">
                          <button
                            onClick={() => setAutoAssign(!autoAssign)}
                            className="flex items-center gap-2 group"
                          >
                            <div className={`w-8 h-4 rounded-full transition-colors relative ${autoAssign ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoAssign ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">Auto-Match</span>
                          </button>
                          <button
                            onClick={() => handleSimulate(false)}
                            className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest hover:underline"
                          >
                            Randomize
                          </button>
                        </div>
                      </div>

                      <div className="p-6 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">Groq AI Optimization Service</p>
                      </div>
                    </div>
                  </div>

                  {predictiveAlerts.length > 0 && !loading && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-rose-500/10 transition-colors" />
                      <h3 className="text-[12px] font-bold uppercase text-rose-500 tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        Neural Sentinel Alerts
                      </h3>
                      <div className="space-y-6">
                        {predictiveAlerts.map((alert, i) => (
                          <div key={i} className="relative z-10 p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-zinc-100 dark:border-zinc-800 group-hover:border-rose-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="text-[14px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{alert.resident}</h4>
                                <p className="text-[13px] font-semibold text-rose-500">{alert.risk}</p>
                              </div>
                              <span className="text-[11px] font-bold px-3 py-1 bg-rose-500 text-white rounded-lg shadow-sm">{alert.confidence}% Conf.</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center">
                                    <span className="text-[11px] font-bold text-zinc-400 block uppercase mb-1">HR</span>
                                    <span className="text-[14px] font-bold text-indigo-500">{alert.vitals.hr}</span>
                                </div>
                                <div className="text-center border-x border-zinc-200 dark:border-zinc-800">
                                    <span className="text-[11px] font-bold text-zinc-400 block uppercase mb-1">OX</span>
                                    <span className="text-[14px] font-bold text-emerald-500">{alert.vitals.ox}%</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[11px] font-bold text-zinc-400 block uppercase mb-1">Mobility</span>
                                    <span className="text-[14px] font-bold text-amber-500">{alert.vitals.mobility}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setForm({
                                        resident_name: alert.resident,
                                        room_number: 101, // Mock
                                        floor: 1, // Mock
                                        episode_type: alert.risk.toLowerCase().includes('fall') ? 'fall' : alert.risk.toLowerCase().includes('cardiac') ? 'cardiac' : 'warning',
                                        severity: alert.confidence > 90 ? 'critical' : 'warning',
                                        trend: 'worsening',
                                        alarms: ["Sentinel Prediction"]
                                    });
                                    handleRecommend({
                                        resident_name: alert.resident, room_number: 101, floor: 1,
                                        episode_type: 'fall', severity: 'critical', trend: 'worsening', alarms: []
                                    });
                                }}
                                className="w-full mt-5 py-3 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[12px] font-bold uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                Pre-emptive Dispatch
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allScores.length > 0 && !loading && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-10 shadow-2xl">
                      <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-8">Proximity Ranking</h3>
                      <div className="space-y-6">
                        {allScores.slice(0, 10).map(s => (
                          <div key={s.name}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[11px] font-black uppercase tracking-tight text-zinc-600 dark:text-zinc-300">{s.name}</span>
                              <span className="text-[11px] font-black text-indigo-500">{s.score}% Match</span>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.score}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-8">
                  {!recommendations && !loading && (
                    <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 text-center min-h-[500px]">
                      <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-3xl">🛰️</span>
                      </div>
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tighter mb-4 uppercase">Awaiting Directives</h3>
                      <p className="text-zinc-500 max-w-sm text-[13px] font-semibold uppercase tracking-widest opacity-60 px-4">ML Selection Engine monitoring telemetry...</p>
                    </div>
                  )}
                  {loading && (
                    <div className="h-full min-h-[450px] flex flex-col items-center justify-center bg-zinc-900 border border-white/5 rounded-[3rem] p-16 text-center relative overflow-hidden">
                      <div className="absolute inset-0 z-0 opacity-10">
                        <div className="absolute inset-0 border border-white rounded-full animate-ping duration-1000 scale-[3]" />
                        <div className="absolute inset-0 border border-white rounded-full animate-ping duration-1000 delay-300 scale-[2]" />
                        <div className="absolute inset-0 border border-white rounded-full animate-ping duration-1000 delay-700 scale-[1]" />
                      </div>

                      <div className="relative z-10">
                        <div className="relative w-36 h-36 mb-8 mx-auto">
                          <div className="absolute inset-0 bg-indigo-600/20 rounded-[2.5rem] blur-3xl animate-pulse" />
                          <NeuralAvatar
                             src={caregivers[scanIndex]?.photo_url}
                             name={caregivers[scanIndex]?.name}
                             className="w-full h-full rounded-[2.5rem] border-4 border-indigo-500 shadow-3xl text-5xl"
                             role={caregivers[scanIndex]?.role}
                          />
                          <div className="absolute -top-3 -right-3 bg-indigo-600 text-white text-[8px] font-black px-3 py-1.5 rounded-lg animate-bounce uppercase">SCANNING</div>
                        </div>

                        <h3 className="text-3xl font-black text-white tracking-tightest mb-2">ML OPTIMIZER</h3>
                        <p className="text-indigo-400 font-bold uppercase tracking-[0.4em] mb-8 text-[9px]">Matching Responder: {caregivers[scanIndex]?.name?.toUpperCase()}</p>

                        <div className="justify-center gap-1.5 flex">
                          {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />)}
                        </div>
                      </div>

                      <div className="absolute bottom-12 left-0 w-full flex justify-center gap-8 text-[8px] font-black text-zinc-600 uppercase tracking-widest px-10">
                        <p className="animate-pulse">Analyzing Load</p>
                        <p className="animate-pulse delay-75">Fatigue Calc</p>
                        <p className="animate-pulse delay-150">Proximity</p>
                      </div>
                    </div>
                  )}
                  {recommendations && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                      <header className="flex flex-col md:flex-row md:items-end justify-between px-4 gap-6">
                        <div>
                          <h2 className={`text-5xl font-black ${episode?.severity === 'emergency' ? 'text-rose-600' : 'text-zinc-900 dark:text-white'} tracking-tighter`}>
                            {episode?.severity === 'emergency' ? '🚨 ULTRA-CRITICAL DISPATCH' : 'Recommended Caregivers'}
                          </h2>
                          <p className="text-zinc-400 font-bold uppercase tracking-widest mt-2">Target Resident: {episode?.resident_name} // {episode?.severity?.toUpperCase()} ALERT</p>
                        </div>
                        {episode?.severity === 'emergency' && (
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleEmergencyAlert("Ambulance")}
                              disabled={episode.external_alerts?.some(a => a.type === "Ambulance")}
                              className={`${episode.external_alerts?.some(a => a.type === "Ambulance") ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-rose-600 text-white shadow-xl shadow-rose-600/30 hover:scale-105'} font-black px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all`}
                            >
                              {episode.external_alerts?.some(a => a.type === "Ambulance") ? "Ambulance Dispatched ✅" : "Summon Ambulance"}
                            </button>
                            <button
                              onClick={() => handleEmergencyAlert("Doctor")}
                              disabled={episode.external_alerts?.some(a => a.type === "Doctor")}
                              className={`${episode.external_alerts?.some(a => a.type === "Doctor") ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white shadow-xl hover:scale-105'} font-black px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all`}
                            >
                              {episode.external_alerts?.some(a => a.type === "Doctor") ? "Doctor Notified ✅" : "Alert Doctor"}
                            </button>
                          </div>
                        )}
                      </header>
                      <div className="space-y-10">
                        {recommendations.map(rec => <RecommendationCard key={rec.rank} rec={rec} onAssign={handleAssign} loading={assigning} />)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "fatigue" && <FatigueTab />}

          {tab === "live" && (
            <div className="animate-in fade-in duration-1000">
              <div className="mb-16">
                <h2 className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-4">Live Operations</h2>
                <p className="text-lg text-zinc-500 font-medium opacity-80 uppercase tracking-widest text-[13px] font-black">Real-time Mission Tracking Center</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                <div className="xl:col-span-8 space-y-8">
                  <h3 className="text-[14px] font-black text-zinc-400 uppercase tracking-widest px-2">Active Field Deployments</h3>
                  {history.filter(ep => ep.status === 'open').length === 0 ? (
                    <div className="py-40 bg-white/5 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] flex flex-col items-center justify-center text-center">
                      <span className="text-8xl mb-10 opacity-20">📡</span>
                      <p className="text-zinc-500 font-black uppercase tracking-widest text-lg">No Active Deployments</p>
                      <p className="text-zinc-400 font-medium">All units are currently on standby or routine rounds.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {history.filter(ep => ep.status === 'open').map(ep => {
                        const cg = caregivers.find(c => c.id === ep.caregiver_id || c.name === ep.assigned_to);
                        return (
                          <div key={ep.id} className="group bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl flex flex-col sm:flex-row items-center gap-10 transition-all hover:border-indigo-500/30">
                            <div className="flex items-center gap-6">
                              <div className="relative">
                                <NeuralAvatar src={cg?.photo_url} name={cg?.name || "???"} role={cg?.role} className="w-20 h-20 rounded-3xl ring-4 ring-indigo-500/10" />
                                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">ON_SITE</div>
                              </div>
                              <div>
                                <h4 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1">{cg?.name || ep.assigned_to}</h4>
                                <p className="text-[12px] font-black text-indigo-500 uppercase tracking-widest">{cg?.role} // Dispatch Alpha</p>
                              </div>
                            </div>

                            <div className="hidden md:block w-px h-16 bg-zinc-200 dark:bg-zinc-800" />

                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-3">
                                <span className={`w-3.5 h-3.5 rounded-full ${SEVERITY_COLOR[ep.severity]?.bg} animate-pulse`} />
                                <h5 className="text-[13px] font-black text-zinc-400 uppercase tracking-widest">Target: <span className="text-zinc-900 dark:text-white">{ep.resident || ep.resident_name} (RM {ep.room_number})</span></h5>
                              </div>
                              <div className="flex gap-4">
                                <span className="bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-200 dark:border-zinc-700">Type: {ep.type}</span>
                                <span className="bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-200 dark:border-zinc-700">Started: {new Date(ep.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            
                            <div className="shrink-0">
                               <div className="text-right">
                                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-tighter mb-1">Mission Elapsed</p>
                                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tightest leading-none">
                                    {Math.floor((Date.now()/1000 - ep.timestamp)/60)}<span className="text-lg opacity-40 ml-1">MIN</span>
                                  </p>
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="xl:col-span-4 space-y-12">
                   <div className="bg-zinc-900 rounded-[3rem] p-10 border border-white/5 overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                      <h3 className="text-[14px] font-black text-indigo-500 uppercase tracking-widest mb-10 flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        Staff Availability
                      </h3>
                      <div className="space-y-8">
                        {['available', 'rounds', 'break'].map(stat => {
                          const count = caregivers.filter(c => c.status === stat).length;
                          const color = stat === 'available' ? 'emerald' : stat === 'rounds' ? 'indigo' : 'amber';
                          return (
                            <div key={stat} className="flex justify-between items-center group cursor-pointer" onClick={() => setTab('caregivers')}>
                               <div>
                                  <p className="text-xs font-black text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors">{stat}</p>
                                  <div className="flex gap-1 mt-2">
                                    {Array.from({length: Math.min(count, 8)}).map((_, i) => (
                                      <div key={i} className={`w-3.5 h-3.5 rounded-lg bg-${color}-500/20 border border-${color}-500/40`} />
                                    ))}
                                  </div>
                               </div>
                               <span className={`text-4xl font-black text-${color}-500 tracking-tighter`}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                   </div>

                   <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-zinc-200 dark:border-zinc-800">
                      <h3 className="text-[13px] font-black text-zinc-400 uppercase tracking-widest mb-6 px-1">Tactical Legend</h3>
                      <div className="space-y-4">
                         {[
                           { l: "High Priority", c: "bg-rose-500" },
                           { l: "Clinical Lead", c: "bg-indigo-500" },
                           { l: "Standard Response", c: "bg-emerald-500" }
                         ].map(item => (
                           <div key={item.l} className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                             <div className={`w-3 h-3 rounded-full ${item.c}`} />
                             <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">{item.l}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {tab === "caregivers" && (
            <div className="animate-in fade-in duration-1000">
              <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-4">Active Staff</h2>
                  <p className="text-lg text-zinc-500 font-medium max-w-2xl opacity-80">Real-time status monitoring of all staff members currently on shift.</p>
                </div>
                <button onClick={() => setShowAddCg(!showAddCg)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-3">
                  {showAddCg ? "Close Form" : "Add New Caregiver"}
                </button>
              </div>

              {showAddCg && (
                <div className="mb-16 bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-10 shadow-3xl animate-in slide-in-from-top-10 duration-700">
                  <div className="flex items-center gap-6 mb-10">
                    <div className="w-16 h-16 bg-indigo-500 rounded-3xl flex items-center justify-center text-3xl">C</div>
                    <div>
                      <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">New Caregiver Registration</h3>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Enter details to add a new staff member to the system</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3 px-1">Full Name</label>
                      <input type="text" placeholder="e.g. Dr. Sarah Chen" value={newCg.name} onChange={e => setNewCg({ ...newCg, name: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3 px-1">Staff Role</label>
                      <select value={newCg.role} onChange={e => setNewCg({ ...newCg, role: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-widest appearance-none cursor-pointer outline-none">
                        <option value="nurse">Nurse</option>
                        <option value="caregiver">Caretaker</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3 px-1">Floor (1-4)</label>
                      <input type="number" value={newCg.floor} onChange={e => setNewCg({ ...newCg, floor: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
                    </div>
                  </div>

                  <div className="mb-10 p-8 bg-zinc-50 dark:bg-zinc-950 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-4 px-1">Profile Photo</label>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="shrink-0 relative group cursor-pointer" onClick={() => document.getElementById('photo-upload').click()}>
                        <NeuralAvatar
                          src={newCg.photo_url}
                          name={newCg.name || "?"}
                          role={newCg.role}
                          className="w-32 h-32 rounded-[2.5rem] shadow-2xl ring-4 ring-indigo-500/20 group-hover:ring-indigo-500/50 transition-all text-4xl"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-[10px] font-black uppercase">Change</span>
                        </div>
                        <input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) return showToast("Image too large (Max 2MB)");
                              const reader = new FileReader();
                              reader.onloadend = () => setNewCg({ ...newCg, photo_url: reader.result });
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>

                      <div className="flex-1 w-full space-y-6">
                        <div>
                          <h4 className="text-sm font-black text-zinc-900 dark:text-white mb-2">Upload Profile Image</h4>
                          <p className="text-xs text-zinc-500 font-medium">Click the avatar to upload a local file from your system. Supported: JPG, PNG, WEBP (Max 2MB).</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <p className="text-[9px] font-black text-zinc-400 uppercase w-full">Or Use Specialized Presets:</p>
                          {[
                            { name: "Nurse", url: IMAGES.female },
                            { name: "Caretaker", url: IMAGES.male },
                            { name: "Reset Photo", url: "" }
                          ].map(preset => (
                            <button key={preset.name} type="button" onClick={() => setNewCg({ ...newCg, photo_url: preset.url })}
                              className="text-[9px] font-black uppercase px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500 transition-colors shadow-sm">
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                      <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2">Initial Avg Tasks</label>
                      <input type="number" value={newCg.active_tasks} onChange={e => setNewCg({ ...newCg, active_tasks: e.target.value })}
                        className="w-full bg-transparent text-xl font-black text-zinc-900 dark:text-white outline-none" />
                      <p className="text-[9px] text-zinc-400 mt-2">ML Weight: Moderate Baseline</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                      <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-2">Active Episodes</label>
                      <input type="number" value={newCg.active_episodes} onChange={e => setNewCg({ ...newCg, active_episodes: e.target.value })}
                        className="w-full bg-transparent text-xl font-black text-zinc-900 dark:text-white outline-none" />
                      <p className="text-[9px] text-zinc-400 mt-2">ML Weight: High Strain Load</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                      <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-2">Completed Today</label>
                      <input type="number" value={newCg.assignments_today} onChange={e => setNewCg({ ...newCg, assignments_today: e.target.value })}
                        className="w-full bg-transparent text-xl font-black text-zinc-900 dark:text-white outline-none" />
                      <p className="text-[9px] text-zinc-400 mt-2">ML Weight: Cumulative Fatigue</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                      <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Certification Tags</label>
                      <input type="text" placeholder="cardiac, fall, etc." value={newCg.skills} onChange={e => setNewCg({ ...newCg, skills: e.target.value })}
                        className="w-full bg-transparent text-sm font-bold text-zinc-900 dark:text-white outline-none" />
                      <p className="text-[9px] text-zinc-400 mt-2">Dispatch Matching Skills</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4">
                    <button onClick={() => setShowAddCg(false)} className="px-8 py-4 text-xs font-black uppercase text-zinc-400 hover:text-zinc-900 transition-colors">Discard</button>
                    <button onClick={handleCreateCaregiver} className="bg-zinc-900 dark:bg-indigo-600 text-white font-black px-12 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-2xl hover:scale-105 transition-all">Add to System</button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {caregivers.map(cg => <CaregiverCard key={cg.id} cg={cg} onDelete={handleDeleteCaregiver} adminView={true} />)}
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="animate-in fade-in duration-1000">
              <div className="mb-16 flex items-end justify-between">
                <div>
                  <h2 className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-4">History</h2>
                  <p className="text-lg text-zinc-500 font-medium opacity-80 uppercase tracking-widest text-xs font-black">Archive of past assignments</p>
                </div>
                {history.length > 0 && (
                  <button onClick={handleClearHistory} className="text-[10px] font-black uppercase tracking-widest bg-rose-600/10 text-rose-600 border border-rose-500/20 px-8 py-4 rounded-2xl hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-xl shadow-rose-600/10">Clear Archive</button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="py-40 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] text-center">
                  <p className="text-zinc-400 font-black uppercase tracking-[0.5em]">No History Records</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {[...history].reverse().map((ep) => (
                    <div key={ep.id} className={`group bg-white dark:bg-zinc-900 rounded-[2.5rem] border-l-[16px] p-10 shadow-xl flex items-center justify-between gap-10 transition-all hover:translate-x-2 animate-reveal ${SEVERITY_COLOR[ep.severity]?.border} ${(ep.severity === 'critical' || ep.severity === 'emergency') && ep.status === 'open' ? 'animate-pulse-slow' : ''}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-6 mb-2">
                          <h4 className={`text-3xl font-black tracking-tighter ${ep.status === 'completed' ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-900 dark:text-white'}`}>{ep.resident || ep.resident_name}</h4>
                          <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl ${ep.status === 'completed' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400' : `${SEVERITY_COLOR[ep.severity]?.bg} ${SEVERITY_COLOR[ep.severity]?.text}`}`}>
                            {ep.status === 'completed' ? 'Resolved' : `ALERT_${ep.severity?.toUpperCase()}`}
                          </span>
                        </div>
                        {ep.ai_explanation && (
                          <div className="flex items-start gap-3 bg-zinc-50 dark:bg-black/20 p-4 rounded-2xl border border-zinc-100 dark:border-white/5 mb-4 max-w-2xl">
                            <span className="text-lg">🤖</span>
                            <p className="text-xs font-medium italic text-zinc-500 dark:text-zinc-400 leading-relaxed group-hover:line-clamp-none line-clamp-2 transition-all">"{ep.ai_explanation}"</p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          <p>Room {ep.room_number}</p>
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                          <p>{ep.type}</p>
                          {ep.assigned_to && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                              <p className="text-indigo-500">Staff: {ep.assigned_to}</p>
                            </>
                          )}
                        </div>
                        {ep.external_alerts?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {ep.external_alerts.map((a, idx) => (
                              <span key={idx} className="bg-rose-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-lg">
                                {a.type} SENT @ {new Date(a.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-4 shrink-0">
                        <div className={`text-[10px] font-black uppercase px-4 py-2 rounded-lg ${ep.status === 'open' ? 'text-amber-500 border border-amber-500/20 bg-amber-500/5' : 'text-emerald-500 border border-emerald-500/20 bg-emerald-500/5'}`}>
                           {ep.status === 'open' ? 'Task Active' : 'Task Resolved'}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1 leading-none">{new Date(ep.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest tracking-[0.3em] opacity-40">Record_{ep.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
