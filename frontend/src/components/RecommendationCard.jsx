import NeuralAvatar from "./NeuralAvatar";
import Bar from "./Bar";
import Typewriter from "./Typewriter";
import { FATIGUE_COLOR, RANK_STYLES, getVibeTag } from "../constants/designTokens";

export default function RecommendationCard({ rec, onAssign, loading }) {
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
          <div className="w-full bg-white/30 dark:bg-black/40 rounded-full h-2 overflow-hidden">
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
