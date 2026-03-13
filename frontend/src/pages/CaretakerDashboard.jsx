import { useState, useEffect } from "react";
import { API } from "../constants/api";
import { IMAGES, FATIGUE_COLOR } from "../constants/designTokens";

export default function CaretakerDashboard({ user, onLogout, showToast }) {
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

  const fc = FATIGUE_COLOR[profile.fatigue?.fatigue_level] || FATIGUE_COLOR.Low;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-12 relative overflow-hidden">
      <div className="fixed inset-0 neural-mesh pointer-events-none opacity-50" />
      <header className="flex justify-between items-center mb-20 animate-in slide-in-from-top-10 duration-1000">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-rose-500/30 p-1">
            <img src={profile.photo_url || (profile.role?.toLowerCase().includes('nurse') ? IMAGES.female : IMAGES.male)} className="w-full h-full object-cover rounded-2xl" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter leading-none mb-2">{profile.name}</h1>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Caretaker Dashboard // Unit Room F{profile.floor}</p>
          </div>
        </div>
        <button onClick={onLogout} className="bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl transition-all active:scale-95">Logout</button>
      </header>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-12">
        <div className="xl:col-span-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-black tracking-tightest">Your Active Tasks</h2>
            <div className="flex items-center gap-3 bg-rose-600/10 border border-rose-500/20 px-4 py-2 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">{tasks.length} Pending Incidents</span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center animate-pulse">
              <p className="text-zinc-500 font-black tracking-[0.5em] uppercase text-[10px]">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-40 bg-white/5 border border-dashed border-white/10 rounded-[4rem] flex flex-col items-center justify-center text-center">
              <span className="text-7xl mb-8 opacity-20">📡</span>
              <h3 className="text-3xl font-black text-zinc-500 tracking-tighter mb-4">No Active Signals</h3>
              <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">System monitoring facility status in real-time</p>
            </div>
          ) : (
            <div className="space-y-6">
              {tasks.map(task => (
                <div key={task.id} className={`group bg-zinc-900 border-l-[16px] p-10 rounded-[2.5rem] border-white/5 flex items-center justify-between shadow-2xl transition-all hover:translate-x-2 animate-reveal ${task.severity === 'emergency' ? 'border-rose-600 animate-pulse shadow-rose-600/10' : 'border-indigo-600'}`}>
                  <div>
                    <div className="flex items-center gap-6 mb-4">
                      <h4 className="text-4xl font-black tracking-tighter">{task.resident}</h4>
                      <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-lg ${task.severity === 'emergency' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                        Room {task.room_number} // {task.severity}
                      </span>
                    </div>
                    <div className="flex gap-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <p>Incident: <span className="text-white">{task.type}</span></p>
                      <p>Timestamp: <span className="text-white">{new Date(task.timestamp * 1000).toLocaleTimeString()}</span></p>
                    </div>
                  </div>
                  <button onClick={() => handleComplete(task.id)} className="bg-white text-zinc-950 px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-3xl active:scale-95">Mark Task Done</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-4 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-8 px-2">Staff Status</h3>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between text-[11px] font-black mb-3 px-1">
                  <span className="uppercase text-zinc-400">Shift Fatigue Level</span>
                  <span className={fc.text}>{profile.fatigue?.fatigue_score || 0}%</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-1000" style={{ width: `${profile.fatigue?.fatigue_score || 0}%`, backgroundColor: profile.fatigue?.fatigue_color || '#e11d48' }} />
                </div>
              </div>

              <div className={`${fc.bg} border border-white/5 p-6 rounded-2xl`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-[9px] font-black uppercase ${fc.text}`}>Live System Load: {systemLoad}</p>
                  <div className={`w-2 h-2 rounded-full animate-ping ${systemLoad === 'Stable' ? 'bg-emerald-500' : systemLoad === 'Elevated' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                </div>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                  {profile.fatigue?.recommendation || "Monitoring facility status in real-time."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
