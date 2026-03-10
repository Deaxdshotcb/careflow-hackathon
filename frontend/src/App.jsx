import { useEffect, useState } from "react";
// v4.1.0 - Refresh Trigger

const API = "http://localhost:8000";

// ── Shared Design Tokens ─────────────────────────────────────────────────────
const SEVERITY_COLOR = {
  emergency: { bg: "bg-black dark:bg-zinc-950", border: "border-rose-600", badge: "bg-rose-600", text: "text-rose-600 dark:text-rose-500", pulse: "bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.8)]" },
  critical: { bg: "bg-red-500/10", border: "border-red-500/50", badge: "bg-red-600", text: "text-red-600 dark:text-red-400", pulse: "bg-red-500" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/50", badge: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", pulse: "bg-amber-500" },
  info: { bg: "bg-indigo-500/10", border: "border-indigo-500/50", badge: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400", pulse: "bg-indigo-500" },
};

const STATUS_COLOR = {
  available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30",
  attending: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30",
  rounds: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30",
  break: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-500/30",
  out: "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/30",
};

const IMAGES = {
  hero: "/assets/images/hero.png",
  male: "/assets/images/male.png",
  female: "/assets/images/female.png",
  logo: "/assets/images/logo.png"
};

const FATIGUE_COLOR = {
  Low: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", bar: "#10b981", badge: "bg-emerald-500" },
  Moderate: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", bar: "#f59e0b", badge: "bg-amber-500" },
  High: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", bar: "#f43f5e", badge: "bg-rose-500" },
  Critical: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-600 dark:text-fuchsia-400", bar: "#d946ef", badge: "bg-fuchsia-500" },
};

const RANK_STYLES = {
  primary: { border: "border-indigo-500 dark:border-indigo-400", badge: "bg-indigo-600", label: "🌟 Elite Dispatch" },
  secondary: { border: "border-zinc-300 dark:border-zinc-700", badge: "bg-zinc-600", label: "Qualified Alternate" },
  backup: { border: "border-zinc-200 dark:border-zinc-800", badge: "bg-zinc-400", label: "Reserve Unit" },
};

// ── Components ───────────────────────────────────────────────────────────────

function Bar({ label, value, color = "#6366f1" }) {
  const percentage = typeof value === "number" && value <= 1 ? value * 100 : value;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] font-black text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-widest">
        <span className="truncate max-w-[140px]">{label.replace(/_/g, ' ')}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function TrendChart({ trend }) {
  if (!trend?.length) return null;

  return (
    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-[3rem] border border-zinc-100 dark:border-zinc-800/50 p-10 my-8">
      <div className="h-64 relative">
        {/* Y-Axis Grid Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[100, 75, 50, 25, 0].map(val => (
            <div key={val} className="w-full flex items-center gap-4 h-0">
              <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-600 w-10 shrink-0">{val}%</span>
              <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800 border-dashed" />
            </div>
          ))}
        </div>

        {/* Bars Container - Offset for Labels */}
        <div className="ml-12 h-full flex items-end justify-between gap-3 relative z-10">
          {trend.map((t, i) => {
            const fc = FATIGUE_COLOR[t.fatigue_level] || FATIGUE_COLOR.Low;
            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg shadow-xl text-white whitespace-nowrap ${fc.badge}`}>
                    {t.fatigue_score.toFixed(0)}%
                  </span>
                </div>
                <div
                  className={`w-full max-w-[28px] rounded-t-xl transition-all duration-1000 ease-out shadow-lg ${fc.badge}`}
                  style={{ height: `${t.fatigue_score}%`, transitionDelay: `${i * 50}ms` }}
                />
                <div className="mt-4 text-[10px] font-black text-zinc-400 uppercase tracking-tighter whitespace-nowrap">
                  H{t.hour}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-8 justify-center">
        {Object.entries(FATIGUE_COLOR).map(([level, val]) => (
          <div key={level} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-md ${val.badge}`} />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{level} Zone</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Typewriter Component for AI Effects ---
function Typewriter({ text, speed = 20 }) {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text.charAt(index));
        setIndex(index + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [index, text, speed]);

  return <span>{displayedText}</span>;
}

// Helper for Vibe Tags
function getVibeTag(cg, fatigue) {
  const score = fatigue?.fatigue_score || 0;
  if (score < 15 && cg.status === 'available') return { label: "Peak Efficiency", icon: "🚀", color: "text-emerald-500 bg-emerald-500/10" };
  if (score < 40) return { label: "Fully Balanced", icon: "⚖️", color: "text-indigo-500 bg-indigo-500/10" };
  if (score < 70) return { label: "Steady Load", icon: "📊", color: "text-amber-500 bg-amber-500/10" };
  return { label: "Break Needed", icon: "☕", color: "text-rose-500 bg-rose-500/10" };
}

function NeuralAvatar({ src, name, className, role }) {
  if (src) return <img src={src} className={`${className} object-cover`} alt={name} />;
  const fallback = role?.toLowerCase().includes('nurse') ? IMAGES.female : IMAGES.male;

  // If we have a specialized image and it's not a newly created asset (which defaults to letter),
  // we could use it, but the user wants letters as fallback for new ones.
  // For consistency, let's use the letter as the primary fallback if no src is provided.
  return (
    <div className={`${className} bg-indigo-600 flex items-center justify-center text-white font-black shadow-inner uppercase`}>
      <span className="text-[75%] leading-none">{name ? name[0].toUpperCase() : "?"}</span>
    </div>
  );
}

// --- Login Page ---
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("caretaker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-zinc-950 flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white relative">
      <div className="relative w-full max-w-lg aspect-square mb-[-150px] animate-pulse">
        <div className="absolute inset-0 bg-rose-600/30 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-indigo-600/20 rounded-full blur-[100px] translate-x-12 translate-y-12" />
      </div>

      <div className="relative w-full max-w-[360px] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 mb-4 shadow-2xl overflow-hidden">
            <img src={IMAGES.logo} className="w-full h-full object-cover" alt="CareFlow Logo" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tightest mb-1">CareFlow</h2>
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em]">Care Management System</p>
        </div>

        <div className="space-y-4">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button onClick={() => setRole("caretaker")} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${role === 'caretaker' ? 'bg-rose-600 text-white' : 'text-zinc-500 hover:text-white'}`}>Caretaker</button>
            <button onClick={() => setRole("admin")} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${role === 'admin' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'}`}>Admin</button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">Username</label>
            <input type="text" placeholder="Username" value={username} onChange={e => { setUsername(e.target.value); setError(""); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-4 focus:ring-rose-500/20 outline-none transition-all" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-4 focus:ring-rose-500/20 outline-none transition-all" />
          </div>

          <button onClick={() => { setLoading(true); onLogin(username, password, role, (err) => { setError(err); setLoading(false); }); }} disabled={loading}
            className={`w-full ${role === 'admin' ? 'bg-indigo-600' : 'bg-rose-600'} text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-2`}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] text-rose-500 font-black uppercase text-center tracking-widest">{error}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// --- Caretaker Dashboard ---
function CaretakerDashboard({ user, onLogout, showToast }) {
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
            <img src={profile.photo_url || IMAGES.male} className="w-full h-full object-cover rounded-2xl" />
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

function CaregiverCard({ cg, onDelete, adminView }) {
  const fc = FATIGUE_COLOR[cg.fatigue?.fatigue_level] || FATIGUE_COLOR.Low;
  const vibe = getVibeTag(cg, cg.fatigue);

  return (
    <div className="group bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 animate-reveal relative overflow-hidden">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative shrink-0">
          <NeuralAvatar
            src={cg.photo_url}
            name={cg.name}
            role={cg.role}
            className="w-14 h-14 rounded-2xl ring-2 ring-white dark:ring-zinc-800 shadow-md group-hover:rotate-3 transition-transform"
          />
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 ${cg.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 max-w-full">
            <h4 className="font-black text-zinc-900 dark:text-white truncate leading-tight">{cg.name}</h4>
            <div className={`hidden sm:flex shrink-0 items-center gap-1.5 px-2 py-0.5 rounded-md font-black text-[8px] uppercase tracking-tighter ${vibe.color}`}>
              <span>{vibe.icon}</span> {vibe.label}
            </div>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-1">{cg.role} // F{cg.floor}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <p className="text-[9px] font-black text-zinc-400 uppercase">Tasks</p>
          <p className="text-xs font-black text-indigo-500">{cg.active_tasks}</p>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <p className="text-[9px] font-black text-zinc-400 uppercase">ETA</p>
          <p className="text-xs font-black text-amber-500">{cg.eta_minutes}m</p>
        </div>
      </div>

      {cg.fatigue && (
        <div className={`rounded-2xl p-3 ${fc.bg} border border-indigo-500/5`}>
          <div className="flex justify-between items-center mb-1.5">
            <span className={`text-[9px] font-black uppercase tracking-tighter ${fc.text}`}>ML Strain Predictor</span>
            <span className={`text-[10px] font-black ${fc.text}`}>{cg.fatigue.fatigue_score}%</span>
          </div>
          <div className="w-full bg-white/40 dark:bg-black/40 rounded-full h-1 overflow-hidden">
            <div className="h-full transition-all duration-1000" style={{ width: `${cg.fatigue.fatigue_score}%`, backgroundColor: cg.fatigue.fatigue_color }} />
          </div>
        </div>
      )}

      {adminView && (
        <div className="mt-4 p-4 bg-zinc-50 dark:bg-black/40 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3 px-1">Access Credentials</p>
          <div className="space-y-2">
            <div className="flex justify-between bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl text-[9px] font-bold">
              <span className="text-zinc-400 uppercase">User</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono tracking-tighter">{cg.username}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => onDelete(cg.id)}
        className="mt-4 w-full py-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all border border-zinc-100 dark:border-zinc-800"
      >
        Remove Staff
      </button>
    </div>
  );
}

function RecommendationCard({ rec, onAssign, loading }) {
  const style = RANK_STYLES[rec.rank];
  const cg = rec.caregiver;
  const fc = FATIGUE_COLOR[rec.fatigue?.fatigue_level] || FATIGUE_COLOR.Low;
  const vibe = getVibeTag(cg, rec.fatigue);
  const isElite = rec.rank === 'primary';

  return (
    <div className={`relative bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 ${style.border} p-8 overflow-hidden transition-all duration-700 hover:shadow-3xl group shadow-2xl animate-reveal ${isElite ? 'animate-medical-pulse' : ''}`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />

      <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
        <div className="shrink-0">
          <NeuralAvatar
            src={cg.photo_url}
            name={cg.name}
            role={cg.role}
            className="w-28 h-28 rounded-3xl shadow-2xl ring-4 ring-white dark:ring-zinc-800 transition-transform group-hover:scale-105"
          />
        </div>

        <div className="flex-1 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
            <div className={`inline-flex items-center gap-2 ${style.badge} text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-[0.2em]`}>
              {style.label}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest ${vibe.color}`}>
              {vibe.icon} {vibe.label}
            </div>
          </div>
          <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-2">{cg.name}</h3>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">{cg.role} · Optimized Best Match</p>
          <div className="flex flex-wrap justify-center lg:justify-start gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2 rounded-2xl border border-zinc-100 dark:border-zinc-700">
              <span className="text-[10px] font-black text-zinc-400 uppercase block">Proximity</span>
              <span className="text-lg font-black text-indigo-500">{rec.predicted_eta_minutes}m</span>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2 rounded-2xl border border-zinc-100 dark:border-zinc-700">
              <span className="text-[10px] font-black text-zinc-400 uppercase block">Confidence</span>
              <span className="text-lg font-black text-emerald-500">High</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <div className="bg-indigo-600 p-8 rounded-[2rem] text-white text-center shadow-2xl shadow-indigo-600/30 min-w-[160px]">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Match Index</p>
            <p className="text-6xl font-black tracking-tighter">{rec.score}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
        <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-700/50">
          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 px-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Selection Scoring Breakdown
          </h4>
          <div className="space-y-4">
            {Object.entries(rec.breakdown).map(([k, v]) => (
              <Bar key={k} label={k} value={v} color={v >= 0.7 ? "#10b981" : v >= 0.4 ? "#f59e0b" : "#f43f5e"} />
            ))}
          </div>
        </div>

        <div className={`${fc.bg} rounded-3xl p-6 border border-indigo-500/5 flex flex-col justify-center`}>
          <div className="flex justify-between items-center mb-6">
            <p className={`text-[10px] font-black uppercase tracking-widest ${fc.text}`}>🧠 Staff Fatigue Analysis</p>
            <span className={`text-xs font-black uppercase px-3 py-1 rounded-xl ${fc.badge} text-white`}>{rec.fatigue.fatigue_level}</span>
          </div>
          <p className={`text-lg font-bold italic leading-relaxed ${fc.text} mb-8`}>
            "{rec.fatigue.recommendation}"
          </p>
          <div className="w-full bg-white/30 dark:bg-black/30 rounded-full h-2 overflow-hidden">
            <div className="h-full transition-all duration-1000" style={{ width: `${rec.fatigue.fatigue_score}%`, backgroundColor: rec.fatigue.fatigue_color }} />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-6 bg-zinc-900 rounded-3xl p-6 text-zinc-100">
        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg animate-float">🤖</div>
        <p className="text-sm font-medium italic opacity-90 flex-1 leading-relaxed line-clamp-2">
          "<Typewriter text={rec.explanation} speed={15} />"
        </p>
        <button onClick={() => onAssign(cg.id, cg.name, null, rec.explanation)} disabled={loading}
          className="w-full sm:w-auto bg-white text-zinc-950 hover:bg-indigo-50 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-white/10 active:scale-95 disabled:opacity-50 whitespace-nowrap">
          {loading ? "Assigning..." : "Assign Task Now"}
        </button>
      </div>
    </div>
  );
}

function FatigueTab() {
  const [fatigueData, setFatigueData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/fatigue/all`).then(r => r.json()).then(d => { setFatigueData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const selectCaregiver = async (id) => {
    setSelected(id); setDetail(null);
    const res = await fetch(`${API}/fatigue/${id}`);
    setDetail(await res.json());
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Analyzing staff data...</p>
    </div>
  );

  if (!fatigueData) return <div className="p-12 text-center text-zinc-400 font-bold">📡 FATIGUE_ENGINE_OFFLINE</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-xl">
          <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-[0.2em] mb-1">Fatigue Overview</h3>
          <p className="text-xs text-zinc-400 font-bold mb-8">Shift hour {fatigueData.shift_hour} // Staff Rankings</p>
          <div className="space-y-4">
            {[...fatigueData.predictions].sort((a, b) => b.fatigue_score - a.fatigue_score).map(pred => {
              const fc = FATIGUE_COLOR[pred.fatigue_level] || FATIGUE_COLOR.Low;
              const isSelected = selected === pred.caregiver_id;
              return (
                <button key={pred.caregiver_id} onClick={() => selectCaregiver(pred.caregiver_id)}
                  className={`w-full text-left rounded-2xl p-4 border-2 transition-all duration-300 ${isSelected ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg" : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700"}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-zinc-900 dark:text-white uppercase text-xs tracking-tight">{pred.name}</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${fc.bg} ${fc.text}`}>{pred.fatigue_score}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                    <div className="h-full transition-all duration-1000" style={{ width: `${pred.fatigue_score}%`, backgroundColor: pred.fatigue_color }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-xl">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Neural Input Drivers</h3>
          <div className="space-y-4">
            {fatigueData.feature_importance?.slice(0, 6).map(f => (
              <Bar key={f.feature} label={f.feature} value={f.importance / 100} color="#6366f1" />
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-8">
        {!selected ? (
          <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] p-12 text-center group">
            <div className="w-32 h-32 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center text-6xl mb-8 group-hover:scale-110 transition-transform shadow-inner">👁️‍🗨️</div>
            <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">Staff Details</h3>
            <p className="text-zinc-500 max-w-sm font-medium">Select a staff member from the list to see their performance details.</p>
          </div>
        ) : !detail ? (
          <div className="h-full flex items-center justify-center py-40">
            <div className="w-16 h-16 border-8 border-indigo-100 dark:border-zinc-800 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10">
                <div className="text-right">
                  <p className="text-7xl font-black tracking-tighter leading-none" style={{ color: detail.fatigue.fatigue_color }}>{detail.fatigue.fatigue_score}%</p>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Active Fatigue Score</p>
                </div>
              </div>
              <div className="flex items-center gap-6 mb-12">
                <NeuralAvatar
                  src={detail.caregiver.photo_url}
                  name={detail.caregiver.name}
                  role={detail.caregiver.role}
                  className="w-24 h-24 rounded-[2rem] shadow-2xl ring-4 ring-white dark:ring-zinc-800"
                />
                <div>
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1">{detail.caregiver.name}</h2>
                  <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest">{detail.caregiver.role} // Hub Level {detail.caregiver.floor}</p>
                </div>
              </div>

              <div className={`rounded-[2rem] p-8 mb-10 ${FATIGUE_COLOR[detail.fatigue.fatigue_level]?.bg} border border-indigo-500/10`}>
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-xl font-black uppercase tracking-tighter ${FATIGUE_COLOR[detail.fatigue.fatigue_level]?.text}`}>{detail.fatigue.fatigue_level} FATIGUE ACTIVE</span>
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-2xl uppercase shadow-lg whitespace-nowrap">Load Multiplier: ×{detail.fatigue.dispatch_penalty}</span>
                </div>
                <p className={`text-xl font-bold italic leading-relaxed ${FATIGUE_COLOR[detail.fatigue.fatigue_level]?.text} mb-8 opacity-90`}>"{detail.fatigue.recommendation}"</p>
                <div className="w-full bg-white/40 dark:bg-black/40 rounded-full h-3">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg" style={{ width: `${detail.fatigue.fatigue_score}%`, backgroundColor: detail.fatigue.fatigue_color }} />
                </div>
              </div>

              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 px-2">Performance Data Values</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(detail.fatigue.feature_breakdown).map(([k, v]) => (
                  <div key={k} className="bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-700">
                    <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 truncate">{k.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-white leading-none tracking-tighter">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl p-10">
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-2">Predictive Strain Vector</h3>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-10">12-Hour neural projection window</p>
              <TrendChart trend={detail.shift_trend} />
              <div className="flex flex-wrap gap-4 mt-8">
                {detail.shift_trend.filter((_, i) => i % 3 === 0).map(t => {
                  const fc = FATIGUE_COLOR[t.fatigue_level] || FATIGUE_COLOR.Low;
                  return (
                    <div key={t.hour} className={`px-6 py-4 rounded-2xl border ${fc.bg} min-w-[120px] transition-transform hover:scale-105`}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60" style={{ color: fc.text.replace('text-', '').split(' ')[0].replace('dark:', '') === 'emerald' ? '#10b981' : '#6366f1' }}>Hour {t.hour}</p>
                      <p className={`text-2xl font-black ${fc.text}`}>{t.fatigue_score.toFixed(0)}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Main App Logic ──────────────────────────────────────────────────────────

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
      const [cg, sum, hist] = await Promise.all([fetch(`${API}/caregivers`), fetch(`${API}/shift/summary`), fetch(`${API}/episodes/history`)]);
      setCaregivers(await cg.json()); setSummary(await sum.json()); setHistory(await hist.json());
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
        // Only sync if we're not currently scanning or assigning
        if (!loading && !assigning) {
          fetchData();
        }
      }, 2000); // Trigger every 2 seconds for immediate reflection
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
      }, 15000); // Trigger every 15 seconds if idle
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

    // Artificial delay for the "Scanning Animation"
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

        // Auto-assign top recommendation if enabled
        if (autoAssign && data.recommendations?.length > 0) {
          const top = data.recommendations[0].caregiver;
          showToast(`AUTO-MARK: Deployment Initiated for ${top.name}`);

          // Longer delay to let user see the final choice (as requested)
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

  const handleComplete = async (episodeId, caregiverId) => {
    try {
      const resp = await fetch(`${API}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: episodeId, caregiver_id: caregiverId })
      });
      if (resp.ok) {
        showToast("Case resolved. Staff availability updated.");

        // If this was the active emergency/scan being viewed, reset the Dispatch tab
        if (episode?.id === episodeId) {
          setEpisode(null);
          setRecommendations(null);
        }

        fetchData();
      }
    } catch (e) { showToast("Error updating status"); }
  };

  const handleEmergencyAlert = async (type) => {
    if (!episode?.id) return;

    // Check if already dispatched to prevent duplicates
    if (episode.external_alerts?.some(a => a.type === type)) {
      showToast(`${type.toUpperCase()} already dispatched`);
      return;
    }

    // Explicit browser alert as requested
    alert(`[SYSTEM ALERT] Emergency services triggered: ${type.toUpperCase()}\nDispatching to Room ${form.room_number}...`);

    try {
      const resp = await fetch(`${API}/history/${episode.id}/alert?alert_type=${type}`, { method: "POST" });
      const data = await resp.json();

      if (data.success) {
        showToast(`${type.toUpperCase()} SIGNAL SENT`);
        // Update local state so buttons reflect the change immediately
        setEpisode(prev => ({
          ...prev,
          external_alerts: [...(prev.external_alerts || []), { type, timestamp: Date.now() / 1000 }]
        }));
        fetchData();
      } else {
        showToast(data.message);
      }
    } catch (e) { showToast("Signal Failure"); }
  };

  const tabs = [
    { id: "dispatch", label: "Dispatch", icon: "" },
    { id: "fatigue", label: "Fatigue Analysis", icon: "" },
    { id: "caregivers", label: "Caregivers", icon: "" },
    { id: "history", label: "History", icon: "" },
  ];


  if (!user) return <LoginPage onLogin={handleLogin} />;

  if (user.role === 'caretaker') return <CaretakerDashboard user={user} onLogout={handleLogout} showToast={showToast} />;

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
                  { l: "Available Staff", v: summary.available_now, c: "text-emerald-500" },
                  { l: "High Fatigue", v: summary.high_fatigue_count, c: "text-rose-500" },
                  { l: "Total Assignments", v: summary.total_assignments_today, c: "text-indigo-500" }
                ].map(s => (
                  <div key={s.l} className="text-right">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1.5">{s.l}</p>
                    <p className={`text-xl font-black ${s.c} leading-none tracking-tighter`}>{s.v}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setDarkMode(!darkMode)} className="w-14 h-14 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-2xl transition-all shadow-lg active:scale-90 hover:shadow-indigo-500/10">
              {darkMode ? "🌙" : "☀️"}
            </button>
            <button onClick={handleLogout} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
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
              className={`relative px-8 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 border ${tab === t.id
                ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-y-[-2px] border-indigo-500"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border-transparent hover:bg-white/80 dark:hover:bg-white/10 hover:backdrop-blur-xl hover:border-zinc-200 dark:hover:border-zinc-700/50 hover:shadow-2xl hover:shadow-black/5"
                }`}
            >
              {t.label}
              {tab === t.id && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]" />}
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
                <div className="relative h-[280px] rounded-[3rem] overflow-hidden mb-12 group shadow-2xl border border-zinc-200 dark:border-zinc-800">
                  <img src={IMAGES.hero} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms] blur-[1px] brightness-[0.4]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent flex flex-col justify-center p-12">
                    <div className="max-w-xl">
                      <span className="inline-block bg-indigo-600 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] mb-6 text-white shadow-xl">System Operational</span>
                      <h2 className="text-5xl font-black text-white tracking-tightest leading-none mb-4">STAFF DISPATCH</h2>
                      <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest opacity-80">Neural Coordination & Intelligence Platform</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative">
                <div className="lg:col-span-4 lg:sticky lg:top-44 self-start max-h-[calc(100vh-12rem)] overflow-y-auto pr-2 scrollbar-none space-y-12 pb-10 mask-v-fade">
                  <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-10 shadow-2xl">
                    <div className="flex items-center justify-between mb-10">
                      <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-4">
                        <span className={`w-4 h-4 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-indigo-500 animate-pulse-slow'}`} />
                        AI Dispatch Sensor
                      </h2>
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all active:scale-95 ${isPaused ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}
                      >
                        {isPaused ? "▶ Start Auto-Monitor" : "⏸ Pause Auto-Monitor"}
                      </button>
                    </div>

                    <div className="space-y-8">
                      {[{ l: "Resident Name", k: "resident_name", t: "text" }, { l: "Room Number", k: "room_number", t: "number" }, { l: "Floor", k: "floor", t: "number" }].map(f => (
                        <div key={f.k}>
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3 px-1">{f.l}</label>
                          <input type={f.t} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800/50 outline-none" />
                        </div>
                      ))}

                      <div className="grid grid-cols-1 gap-6">
                        {[{ l: "Episode Type", k: "episode_type", o: ["cardiac", "fall", "respiratory", "wandering", "unconscious", "seizure", "trauma"] }, { l: "Priority", k: "severity", o: ["emergency", "critical", "warning", "info"] }].map(f => (
                          <div key={f.k}>
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3 px-1">{f.l}</label>
                            <select value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                              className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${form.severity === 'emergency' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-zinc-200 dark:border-zinc-800'} rounded-2xl px-6 py-5 text-sm font-bold uppercase tracking-widest appearance-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all outline-none`}>
                              {f.o.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-4">
                        <button
                          onClick={() => handleRecommend()}
                          disabled={loading}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {loading ? "Analyzing Data..." : "🚀 Trigger Smart Scan"}
                        </button>

                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setAutoAssign(!autoAssign)}
                              className={`w-10 h-5 rounded-full transition-colors relative ${autoAssign ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                            >
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoAssign ? 'left-6' : 'left-1'}`} />
                            </button>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Auto-Assign Best Match</span>
                          </div>
                          <button
                            onClick={() => handleSimulate(false)}
                            className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:underline"
                          >
                            Randomize Entry
                          </button>
                        </div>
                      </div>

                      <div className="p-8 bg-zinc-50 dark:bg-black/40 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                        </div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Powered by Llama 3 & Groq AI // Neural Dispatch Optimization</p>
                      </div>
                    </div>
                  </div>

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
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] p-8 text-center">
                      <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-8 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-4xl">🛰️</span>
                      </div>
                      <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">Awaiting Dispatch Directives</h3>
                      <p className="text-zinc-500 max-w-md text-sm font-medium leading-relaxed opacity-70 px-4">The ML Selection Engine is monitoring facility telemetry data to deploy the optimal caregiver to target rooms in real-time.</p>
                    </div>
                  )}
                  {loading && (
                    <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-zinc-900 border border-white/5 rounded-[4rem] p-24 text-center relative overflow-hidden">
                      {/* Radar Animation Background */}
                      <div className="absolute inset-0 z-0 opacity-10">
                        <div className="absolute inset-0 border border-white rounded-full animate-ping duration-1000 scale-[3]" />
                        <div className="absolute inset-0 border border-white rounded-full animate-ping duration-1000 delay-300 scale-[2]" />
                        <div className="absolute inset-0 border border-white rounded-full animate-ping duration-1000 delay-700 scale-[1]" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent w-full h-full rotate-45 origin-center animate-spin-slow" />
                      </div>

                      <div className="relative z-10">
                        <div className="relative w-48 h-48 mb-12 mx-auto">
                          <div className="absolute inset-0 bg-indigo-600/20 rounded-[3rem] blur-3xl animate-pulse" />
                          <NeuralAvatar
                            src={caregivers[scanIndex]?.photo_url}
                            name={caregivers[scanIndex]?.name}
                            className="w-full h-full rounded-[3rem] border-4 border-indigo-500 shadow-3xl text-6xl"
                          />
                          <div className="absolute -top-4 -right-4 bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-xl animate-bounce">SCANNING STAFF</div>
                        </div>

                        <h3 className="text-5xl font-black text-white tracking-tightest mb-4">ML SELECTION ENGINE</h3>
                        <p className="text-indigo-400 font-bold uppercase tracking-[0.5em] mb-10 text-xs">Matching Best Responder: {caregivers[scanIndex]?.name?.toUpperCase()}</p>

                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />)}
                        </div>
                      </div>

                      <div className="absolute bottom-20 left-0 w-full flex justify-center gap-12 text-[10px] font-black text-zinc-600 uppercase tracking-widest px-20">
                        <p className="animate-pulse">Analyzing Proximity</p>
                        <p className="animate-pulse delay-75">Fatigue Calculation</p>
                        <p className="animate-pulse delay-150">Skill Matching</p>
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
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setNewCg({ ...newCg, photo_url: preset.url })}
                              className="text-[9px] font-black uppercase px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500 transition-colors shadow-sm"
                            >
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
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] font-black uppercase tracking-widest bg-rose-600/10 text-rose-600 border border-rose-500/20 px-8 py-4 rounded-2xl hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-xl shadow-rose-600/10"
                  >
                    Clear Archive
                  </button>
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
                          <h4 className={`text-3xl font-black tracking-tighter ${ep.status === 'completed' ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-900 dark:text-white'}`}>
                            {ep.resident || ep.resident_name}
                          </h4>
                          <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl ${ep.status === 'completed' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400' : `${SEVERITY_COLOR[ep.severity]?.bg} ${SEVERITY_COLOR[ep.severity]?.text}`}`}>
                            {ep.status === 'completed' ? 'Resolved' : `ALERT_${ep.severity?.toUpperCase()}`}
                          </span>
                        </div>
                        {ep.ai_explanation && (
                          <div className="flex items-start gap-3 bg-zinc-50 dark:bg-black/20 p-4 rounded-2xl border border-zinc-100 dark:border-white/5 mb-4 max-w-2xl">
                            <span className="text-lg">🤖</span>
                            <p className="text-xs font-medium italic text-zinc-500 dark:text-zinc-400 leading-relaxed group-hover:line-clamp-none line-clamp-2 transition-all">
                              "{ep.ai_explanation}"
                            </p>
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
                        {ep.status === 'open' ? (
                          <div className="text-[10px] font-black uppercase text-amber-500 border border-amber-500/20 px-4 py-2 rounded-lg bg-amber-500/5">
                            Task Active
                          </div>
                        ) : (
                          <div className="text-[10px] font-black uppercase text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg bg-emerald-500/5">
                            Task Resolved
                          </div>
                        )}
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
