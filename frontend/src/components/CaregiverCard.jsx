import NeuralAvatar from "./NeuralAvatar";
import { FATIGUE_COLOR, getVibeTag } from "../constants/designTokens";

export default function CaregiverCard({ cg, onDelete, adminView }) {
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
