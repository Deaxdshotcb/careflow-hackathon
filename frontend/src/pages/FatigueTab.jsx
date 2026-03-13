import { useState, useEffect } from "react";
import Bar from "../components/Bar";
import NeuralAvatar from "../components/NeuralAvatar";
import TrendChart from "../components/TrendChart";
import { API } from "../constants/api";
import { FATIGUE_COLOR } from "../constants/designTokens";

export default function FatigueTab() {
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
