import { FATIGUE_COLOR } from "../constants/designTokens";

export default function TrendChart({ trend }) {
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
