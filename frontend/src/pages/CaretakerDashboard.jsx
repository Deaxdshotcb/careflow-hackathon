import { useState, useEffect } from "react";
import { API } from "../constants/api";
import { IMAGES, FATIGUE_COLOR } from "../constants/designTokens";

export default function CaretakerDashboard({ user, onLogout, showToast, darkMode, setDarkMode }) {
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [systemLoad, setSystemLoad] = useState("Normal");

  const fetchTasks = async () => {
    try {
      const resp = await fetch(`${API}/tasks/${user.id}`);
      const data = await resp.json();
      if (data.length > tasks.length && tasks.length > 0) {
        showToast("⚠️ NEW TASK ASSIGNED!");
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
        fetchProfile(); // Refresh fatigue immediately on new task
      }
      setTasks(data);
    } catch (e) { console.error("Task Sync Error", e); }
    setLoading(false);
  };

  const fetchProfile = async () => {
    try {
      const resp = await fetch(`${API}/fatigue/${user.id}`);
      const data = await resp.json();
      setProfile(prev => ({ ...prev, ...data.caregiver, fatigue: data.fatigue }));

      // Map system pressure to human-readable status
      const score = data.fatigue?.fatigue_score || 0;
      if (score > 70) setSystemLoad("Critical");
      else if (score > 40) setSystemLoad("Elevated");
      else setSystemLoad("Stable");
    } catch (e) { console.error("Profile Sync Error", e); }
  };

  useEffect(() => {
    fetchTasks();
    fetchProfile();
    const interval = setInterval(() => {
      fetchTasks();
      fetchProfile();
    }, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleComplete = async (taskId) => {
    try {
      await fetch(`${API}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: taskId, caregiver_id: user.id })
      });
      showToast("Task completed successfully");
      fetchTasks();
      fetchProfile();
    } catch (e) { showToast("Completion Error"); }
  };

  const [reportingTask, setReportingTask] = useState(null);
  const [reportNotes, setReportNotes] = useState("");
  const [generatedReport, setGeneratedReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!reportingTask) return;
    setIsGenerating(true);
    try {
      const resp = await fetch(`${API}/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: reportingTask.id,
          caregiver_name: user.name,
          resident_name: reportingTask.resident,
          episode_type: reportingTask.type,
          notes: reportNotes
        })
      });
      const data = await resp.json();
      if (data.success) {
        setGeneratedReport(data.report);
      }
    } catch (e) { showToast("Error generating report"); }
    setIsGenerating(false);
  };

  const handleFinalizeWithReport = async (taskId) => {
    await handleComplete(taskId);
    setReportingTask(null);
    setReportNotes("");
    setGeneratedReport("");
  };

  const fc = FATIGUE_COLOR[profile.fatigue?.fatigue_level] || FATIGUE_COLOR.Low;

  return (
    <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white p-12 relative transition-colors duration-700 overflow-hidden ${darkMode ? 'dark' : ''}`}>
      <div className="fixed inset-0 neural-mesh pointer-events-none opacity-50 dark:opacity-50 opacity-20" />
      
      {/* --- AI Reporting Modal Overlay --- */}
      {reportingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-2xl rounded-[3rem] p-10 shadow-3xl shadow-indigo-600/10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                     <header className="mb-10 flex justify-between items-start">
              <div>
                <h3 className="text-4xl font-bold tracking-tightest mb-2">AI Clinical Reporter</h3>
                <p className="text-[13px] font-bold text-indigo-500 uppercase tracking-widest">Documenting Incident // EPID: {reportingTask.id}</p>
              </div>
              <button onClick={() => setReportingTask(null)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </header>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-none">
              <div className="space-y-3">
                <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Your Brief Observations</label>
                <textarea 
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="e.g. Found resident in floor, alert and oriented. Assisted back to bed..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-base font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[140px] transition-all resize-none"
                />
              </div>

              {!generatedReport ? (
                <button 
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-2xl text-[13px] font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 ring-offset-2 ring-indigo-500 focus:ring-2"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Synthesizing...
                    </span>
                  ) : "🪄 Generate AI Clinical Summary"}
                </button>
              ) : (
                <div className="animate-in slide-in-from-bottom-5 duration-700 space-y-6">
                  <div className="p-8 bg-zinc-950/50 border border-indigo-500/20 rounded-3xl relative">
                    <div className="absolute top-4 right-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest">Draft_Ready</div>
                    <p className="text-base font-medium italic text-zinc-300 leading-relaxed">
                      {generatedReport}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setGeneratedReport("")}
                      className="px-8 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[13px] font-bold uppercase tracking-widest transition-all"
                    >
                      Retry
                    </button>
                    <button 
                      onClick={() => handleFinalizeWithReport(reportingTask.id)}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-6 rounded-2xl text-[13px] font-bold uppercase tracking-widest transition-all shadow-2xl shadow-rose-600/20 active:scale-95"
                    >
                      🚀 Sign & Finalize Incident
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-20 animate-in slide-in-from-top-10 duration-1000 relative z-10">
        <div className="flex items-center gap-8">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-rose-500/30 p-1 bg-white dark:bg-zinc-900">
            <img src={profile.photo_url || (profile.role?.toLowerCase().includes('nurse') ? IMAGES.female : IMAGES.male)} className="w-full h-full object-cover rounded-2xl" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-none mb-2">
              {profile.name}
            </h1>
            <p className="text-[11px] font-bold text-rose-500 uppercase tracking-[0.2em]">Caretaker Dashboard // Unit Room F{profile.floor}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="w-14 h-14 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-2xl transition-all shadow-lg active:scale-90 hover:shadow-rose-500/10"
          >
            {darkMode ? "🌙" : "☀️"}
          </button>
          <button onClick={onLogout} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[13px] font-bold uppercase tracking-widest px-10 py-5 rounded-2xl transition-all active:scale-95 shadow-lg">Logout</button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-12">
        <div className="xl:col-span-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tightest">Your Active Tasks</h2>
            <div className="flex items-center gap-3 bg-rose-600/10 border border-rose-500/10 px-4 py-2 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-rose-500">{tasks.length} Pending</span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center animate-pulse">
              <p className="text-zinc-500 font-bold tracking-[0.5em] uppercase text-[13px]">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-40 bg-white/5 border border-dashed border-white/10 rounded-[4rem] flex flex-col items-center justify-center text-center">
              <span className="text-8xl mb-10 opacity-20">📡</span>
              <h3 className="text-4xl font-bold text-zinc-500 tracking-tighter mb-6">No Active Signals</h3>
              <p className="text-zinc-600 font-bold uppercase tracking-widest text-[13px]">System monitoring facility status in real-time</p>
            </div>
          ) : (
            <div className="space-y-8">
              {tasks.map(task => (
                <div key={task.id} className={`group bg-white dark:bg-zinc-900 border-l-[12px] p-6 md:p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/50 flex flex-col lg:flex-row lg:items-center justify-between shadow-xl transition-all hover:translate-x-1 animate-reveal gap-6 ${task.severity === 'emergency' ? 'border-l-rose-600 animate-pulse shadow-rose-600/5' : 'border-l-indigo-600'}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-3">
                      <h4 className="text-2xl md:text-3xl font-bold tracking-tighter truncate text-zinc-900 dark:text-white">{task.resident}</h4>
                      <span className={`shrink-0 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg text-white ${task.severity === 'emergency' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                        Room {task.room_number} // {task.severity}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                      <p className="flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-white/5 rounded-full">Incident: <span className="text-zinc-900 dark:text-white">{task.type}</span></p>
                      <p className="flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-white/5 rounded-full">Detected: <span className="text-zinc-900 dark:text-white">{new Date(task.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button 
                      onClick={() => setReportingTask(task)} 
                      className="flex-1 lg:flex-none bg-indigo-600/10 border border-indigo-500/20 text-indigo-500 px-6 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                    >
                      AI Report
                    </button>
                    <button 
                      onClick={() => handleComplete(task.id)} 
                      className="flex-1 lg:flex-none bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-8 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all shadow-lg active:scale-95"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
         <div className="xl:col-span-4 space-y-10">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[3rem] p-12 shadow-xl">
            <h3 className="text-[13px] font-bold uppercase tracking-widest text-zinc-500 mb-10 px-2">Staff Status</h3>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between text-[13px] font-bold mb-3 px-1">
                  <span className="uppercase text-zinc-400">Fatigue Level</span>
                  <span className={fc.text}>{profile.fatigue?.fatigue_score || 0}%</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-1000" style={{ width: `${profile.fatigue?.fatigue_score || 0}%`, backgroundColor: profile.fatigue?.fatigue_color || '#e11d48' }} />
                </div>
              </div>
              <div className={`${fc.bg} border border-zinc-100 dark:border-white/5 p-8 rounded-2xl`}>
                <div className="flex items-center justify-between mb-4">
                  <p className={`text-[12px] font-bold uppercase ${fc.text}`}>Live System Load: {systemLoad}</p>
                  <div className={`w-3 h-3 rounded-full animate-ping ${systemLoad === 'Stable' ? 'bg-emerald-500' : systemLoad === 'Elevated' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                </div>
                <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                  {profile.fatigue?.recommendation || "Monitoring facility status in real-time."}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
