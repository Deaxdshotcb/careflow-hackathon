import { useState, useEffect } from "react";
import { IMAGES } from "../constants/designTokens";

export default function LoginPage({ onLogin }) {
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
