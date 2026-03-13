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
    <div className={`relative bg-white dark:bg-zinc-900 rounded-[2rem] border-2 ${style.border} p-6 overflow-hidden transition-all duration-700 hover:shadow-2xl group shadow-xl animate-reveal ${isElite ? 'animate-medical-pulse' : ''}`}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -mr-24 -mt-24 blur-3xl" />

      <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
        <div className="shrink-0">
          <NeuralAvatar
            src={cg.photo_url}
            name={cg.name}
            role={cg.role}
            className="w-24 h-24 rounded-2xl shadow-xl ring-2 ring-white dark:ring-zinc-800 transition-transform group-hover:rotate-2"
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
            <div className={`inline-flex items-center gap-2 ${style.badge} text-white text-[12px] font-bold px-4 py-1.5 rounded-full shadow-md uppercase tracking-widest`}>
              {style.label}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[12px] uppercase tracking-widest ${vibe.color}`}>
              {vibe.icon} {vibe.label}
            </div>
          </div>
          <h3 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tighter mb-2">{cg.name}</h3>
          <p className="text-[13px] font-semibold text-zinc-400 uppercase tracking-widest">{cg.role} · Responder Level {cg.floor}</p>
        </div>

        <div className="shrink-0 flex items-center gap-8">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-40 mb-1">Match</p>
            <p className="text-4xl font-bold tracking-tightest text-indigo-600 dark:text-indigo-400">{rec.score}%</p>
          </div>
          <button onClick={() => onAssign(cg.id, cg.name, null, rec.explanation)} disabled={loading}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-indigo-600 dark:hover:bg-indigo-50 px-8 py-4 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50">
            {loading ? "..." : "Dispatch"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800/50">
        <div className="md:col-span-4 space-y-4">
          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Scoring Breakdown</h4>
          <div className="space-y-3">
            {Object.entries(rec.breakdown).map(([k, v]) => (
              <Bar key={k} label={k} value={v} color={v >= 0.7 ? "#10b981" : v >= 0.4 ? "#f59e0b" : "#f43f5e"} />
            ))}
          </div>
        </div>

        <div className="md:col-span-4 flex flex-col justify-center bg-zinc-50 dark:bg-black/20 p-5 rounded-2xl border border-zinc-100 dark:border-white/5">
          <div className="flex justify-between items-center mb-4">
            <p className={`text-[11px] font-bold uppercase tracking-widest ${fc.text}`}>Fatigue Status</p>
            <span className={`text-[11px] font-bold uppercase px-3 py-1 rounded-md ${fc.badge} text-white`}>{rec.fatigue.fatigue_level}</span>
          </div>
          <p className={`text-[14px] font-semibold italic leading-relaxed ${fc.text} mb-4 line-clamp-2`}>
            "{rec.fatigue.recommendation}"
          </p>
          <div className="w-full bg-white/40 dark:bg-black/40 rounded-full h-2 overflow-hidden">
            <div className="h-full transition-all duration-1000" style={{ width: `${rec.fatigue.fatigue_score}%`, backgroundColor: rec.fatigue.fatigue_color }} />
          </div>
        </div>

        <div className="md:col-span-4 bg-zinc-900 rounded-2xl p-5 flex gap-5 items-center">
            <div className="text-2xl shrink-0">🤖</div>
            <p className="text-[13px] text-zinc-300 font-semibold italic leading-relaxed line-clamp-3">
              "<Typewriter text={rec.explanation} speed={15} />"
            </p>
        </div>
      </div>
    </div>
  );
}
