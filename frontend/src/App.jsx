import { useEffect, useState } from "react";

const API = "http://localhost:8000";

// ── Shared Design Tokens ─────────────────────────────────────────────────────
const SEVERITY_COLOR = {
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

  const SIZE = 400;
  const CENTER = SIZE / 2;
  const MAX_RADIUS = SIZE * 0.4;
  const N = trend.length;

  const getPoint = (index, radius) => {
    const angle = (index / N) * Math.PI * 2 - Math.PI / 2;
    return {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER + radius * Math.sin(angle)
    };
  };

  // Grid Rings (Concentric Polygons)
  const rings = [0.25, 0.5, 0.75, 1].map(r =>
    trend.map((_, i) => {
      const p = getPoint(i, MAX_RADIUS * r);
      return `${p.x},${p.y}`;
    }).join(" ")
  );

  // Data Polygon
  const dataPoints = trend.map((t, i) => {
    const p = getPoint(i, (t.fatigue_score / 100) * MAX_RADIUS);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <div className="flex flex-col items-center py-10 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-[3rem] border border-zinc-100 dark:border-zinc-800/50 my-8">
      <div className="relative w-80 h-80">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full overflow-visible">
          {/* Spider Web Grid */}
          {rings.map((points, i) => (
            <polygon key={i} points={points} fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" strokeDasharray={i === 3 ? "" : "4,4"} />
          ))}

          {/* Axis Spokes */}
          {trend.map((_, i) => {
            const p = getPoint(i, MAX_RADIUS);
            return (
              <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
            );
          })}

          {/* Data Visualization */}
          <polygon points={dataPoints} fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="4" strokeLinejoin="round" className="drop-shadow-2xl" />

          {/* Data Nodes */}
          {trend.map((t, i) => {
            const p = getPoint(i, (t.fatigue_score / 100) * MAX_RADIUS);
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#6366f1" className="drop-shadow-lg" />
                <text
                  x={getPoint(i, MAX_RADIUS + 30).x}
                  y={getPoint(i, MAX_RADIUS + 30).y}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="text-[14px] font-black fill-zinc-400 uppercase"
                >
                  H{t.hour}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-8 flex gap-6 text-[10px] font-black uppercase text-zinc-400 tracking-widest bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-6 py-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" /> Projected Strain
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full border border-zinc-200 dark:border-zinc-700" /> Baseline Capacity
        </div>
      </div>
    </div>
  );
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

function CaregiverCard({ cg }) {
  const fc = FATIGUE_COLOR[cg.fatigue?.fatigue_level] || FATIGUE_COLOR.Low;

  return (
    <div className="group bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
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
          <h4 className="font-black text-zinc-900 dark:text-white truncate leading-tight">{cg.name}</h4>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-1">{cg.role} // F{cg.floor}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${STATUS_COLOR[cg.status]}`}>
          {cg.status}
        </span>
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
    </div>
  );
}

function RecommendationCard({ rec, onAssign, loading }) {
  const style = RANK_STYLES[rec.rank];
  const cg = rec.caregiver;
  const fc = FATIGUE_COLOR[rec.fatigue?.fatigue_level] || FATIGUE_COLOR.Low;

  return (
    <div className={`relative bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 ${style.border} p-8 overflow-hidden transition-all duration-700 hover:shadow-3xl group shadow-2xl`}>
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
          <div className={`inline-flex items-center gap-2 ${style.badge} text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-[0.2em] mb-4`}>
            {style.label}
          </div>
          <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-2">{cg.name}</h3>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">{cg.role} · Optimized Neural Match</p>
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
            Selection Matrix Breakdown
          </h4>
          <div className="space-y-4">
            {Object.entries(rec.breakdown).map(([k, v]) => (
              <Bar key={k} label={k} value={v} color={v >= 0.7 ? "#10b981" : v >= 0.4 ? "#f59e0b" : "#f43f5e"} />
            ))}
          </div>
        </div>

        <div className={`${fc.bg} rounded-3xl p-6 border border-indigo-500/5 flex flex-col justify-center`}>
          <div className="flex justify-between items-center mb-6">
            <p className={`text-[10px] font-black uppercase tracking-widest ${fc.text}`}>🧠 Neural Strain Analysis</p>
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
        <p className="text-sm font-medium italic opacity-90 flex-1 leading-relaxed">"{rec.explanation}"</p>
        <button onClick={() => onAssign(cg.id, cg.name)} disabled={loading}
          className="w-full sm:w-auto bg-white text-zinc-950 hover:bg-indigo-50 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-white/10 active:scale-95 disabled:opacity-50 whitespace-nowrap">
          {loading ? "Transmitting..." : "Initiate Deployment"}
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
      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Calibrating ML Ensembles...</p>
    </div>
  );

  if (!fatigueData) return <div className="p-12 text-center text-zinc-400 font-bold">📡 FATIGUE_ENGINE_OFFLINE</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-xl">
          <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-[0.2em] mb-1">Strain Atlas</h3>
          <p className="text-xs text-zinc-400 font-bold mb-8">Shift hour {fatigueData.shift_hour} // Unit Rankings</p>
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
            <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">Unit Analytics Locked</h3>
            <p className="text-zinc-500 max-w-sm font-medium">Select a field asset from the registry to initialize full neural telemetry breakdown.</p>
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
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Active Bio-Strain Index</p>
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
                  <span className={`text-xl font-black uppercase tracking-tighter ${FATIGUE_COLOR[detail.fatigue.fatigue_level]?.text}`}>{detail.fatigue.fatigue_level} STRAIN ACTIVE</span>
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-2xl uppercase shadow-lg whitespace-nowrap">Penalty Multiplier: ×{detail.fatigue.dispatch_penalty}</span>
                </div>
                <p className={`text-xl font-bold italic leading-relaxed ${FATIGUE_COLOR[detail.fatigue.fatigue_level]?.text} mb-8 opacity-90`}>"{detail.fatigue.recommendation}"</p>
                <div className="w-full bg-white/40 dark:bg-black/40 rounded-full h-3">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg" style={{ width: `${detail.fatigue.fatigue_score}%`, backgroundColor: detail.fatigue.fatigue_color }} />
                </div>
              </div>

              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 px-2">Telemetric Input Values</h4>
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
  const [caregivers, setCaregivers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ resident_name: "Mr. Thomas", room_number: 302, floor: 3, episode_type: "cardiac", severity: "critical", trend: "worsening", alarms: [] });
  const [recommendations, setRecommendations] = useState(null);
  const [allScores, setAllScores] = useState([]);
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [tab, setTab] = useState("dispatch");
  const [toast, setToast] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('careflow-dark') === 'true');
  const [showAddCg, setShowAddCg] = useState(false);
  const [newCg, setNewCg] = useState({
    name: "", role: "caregiver", floor: 1,
    active_tasks: 0, active_episodes: 0, assignments_today: 0,
    skills: "fall, dementia", photo_url: ""
  });

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

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 4000); };

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

  const handleRecommend = async () => {
    setLoading(true); setRecommendations(null);
    try {
      const resp = await fetch(`${API}/recommend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, room_number: Number(form.room_number), floor: Number(form.floor) }) });
      const data = await resp.json();
      setRecommendations(data.recommendations); setEpisode(data.episode); setAllScores(data.all_scores);
    } catch (e) { showToast("Connection Error: Backend Offline"); }
    setLoading(false);
  };

  const handleSimulate = async () => {
    const r = await fetch(`${API}/simulate`, { method: "POST" });
    setForm({ ...await r.json(), alarms: [] });
    showToast("Simulation Generated");
  };

  const handleAssign = async (id, name) => {
    setAssigning(true);
    try {
      await fetch(`${API}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caregiver_id: id, resident_name: form.resident_name }) });
      showToast(`ASSIGNED: ${name} to Room ${form.room_number}`);
      setRecommendations(null); fetchData();
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
        fetchData();
      }
    } catch (e) { showToast("Error updating status"); }
  };

  const tabs = [
    { id: "dispatch", label: "Dispatch", icon: "" },
    { id: "fatigue", label: "Fatigue Analysis", icon: "" },
    { id: "caregivers", label: "Caregivers", icon: "" },
    { id: "history", label: "History", icon: "" },
  ];

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-700 selection:bg-indigo-500 selection:text-white`}>
      <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen">

        {toast && (
          <div className="fixed top-8 right-8 z-[100] bg-zinc-900 dark:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-8 py-5 rounded-[2rem] shadow-3xl animate-in slide-in-from-right-10 fade-in duration-500 border border-white/10 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {toast}
          </div>
        )}

        {/* --- Header --- */}
        <header className="fixed top-0 left-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-b border-zinc-200 dark:border-zinc-800/50 h-24 flex items-center px-12 justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 rotate-3 transition-transform hover:rotate-0 cursor-pointer">
              <img src={IMAGES.logo} className="w-full h-full object-cover" alt="CareFlow Logo" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter leading-none dark:text-white mb-1">CareFlow</h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.3em] opacity-60">Care Management Dashboard // v4.0.1</p>
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
          </div>
        </header>

        {/* --- Navigation --- */}
        <nav className="fixed top-24 left-0 w-full z-40 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900 flex justify-center h-16 items-center px-12 gap-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative px-8 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${tab === t.id ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-y-[-2px]" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* --- Main --- */}
        <main className="pt-52 px-12 pb-24 max-w-[1700px] mx-auto">
          {tab === "dispatch" && (
            <div className="animate-in fade-in duration-1000">
              {(!recommendations && !loading) && (
                <div className="relative h-[500px] rounded-[4rem] overflow-hidden mb-16 group shadow-3xl">
                  <img src={IMAGES.hero} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 blur-[2px] brightness-50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent flex flex-col justify-end p-20">
                    <div className="max-w-3xl">
                      <span className="inline-block bg-indigo-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-white shadow-2xl">System Active</span>
                      <h2 className="text-8xl font-black text-white tracking-[1px] leading-tight mb-6">STAFF <br /> DISPATCH</h2>
                      <p className="text-xl text-zinc-300 font-medium opacity-80 leading-relaxed">Efficiently coordinate and assign staff to residents based on real-time data.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <div className="lg:col-span-4 space-y-12">
                  <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-10 shadow-2xl">
                    <div className="flex items-center justify-between mb-10">
                      <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-4">
                        <span className="w-4 h-4 rounded-full bg-rose-500 animate-pulse-slow" />
                        Active Dispatch
                      </h2>
                      <button onClick={handleSimulate} className="text-[9px] font-black uppercase tracking-[0.2em] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg">Load Data</button>
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
                        {[{ l: "Episode Type", k: "episode_type", o: ["cardiac", "fall", "respiratory", "wandering"] }, { l: "Priority", k: "severity", o: ["critical", "warning", "info"] }].map(f => (
                          <div key={f.k}>
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3 px-1">{f.l}</label>
                            <select value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold uppercase tracking-widest appearance-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all outline-none">
                              {f.o.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>

                      <button onClick={handleRecommend} disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl text-sm uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/40 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 group">
                        {loading ? "Calculating Rank..." : <span className="flex items-center justify-center gap-3">Find Best Caregiver <span className="group-hover:translate-x-2 transition-transform">→</span></span>}
                      </button>
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
                    <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[4rem] p-24 text-center">
                      <div className="text-8xl mb-12"></div>
                      <h3 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter mb-6">Awaiting Dispatch Directives</h3>
                      <p className="text-zinc-500 max-w-lg text-lg font-medium leading-relaxed opacity-70">Initialize a dispatch scan using facility telemetry data to deploy the optimal caregiver to the target room.</p>
                    </div>
                  )}
                  {loading && (
                    <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4rem] p-24 text-center">
                      <div className="relative w-32 h-32 mb-12">
                        <div className="absolute inset-0 border-[12px] border-indigo-100 dark:border-zinc-800 rounded-full" />
                        <div className="absolute inset-0 border-[12px] border-indigo-600 rounded-full border-t-transparent animate-spin" />
                      </div>
                      <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">System Synthesis Active</h3>
                      <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] animate-pulse">Optimizing Dispatch // Fatigue Analysis</p>
                    </div>
                  )}
                  {recommendations && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                      <header className="flex items-end justify-between px-4">
                        <div>
                          <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">Recommended Caregivers</h2>
                          <p className="text-zinc-400 font-bold uppercase tracking-widest mt-2">Target Resident: {episode?.resident_name} // {episode?.severity?.toUpperCase()} ALERT</p>
                        </div>
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
                {caregivers.map(cg => <CaregiverCard key={cg.id} cg={cg} />)}
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
              </div>
              {history.length === 0 ? (
                <div className="py-40 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] text-center">
                  <p className="text-zinc-400 font-black uppercase tracking-[0.5em]">No History Records</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {[...history].reverse().map((ep, i) => (
                    <div key={i} className={`group bg-white dark:bg-zinc-900 rounded-[2.5rem] border-l-[16px] p-10 shadow-xl flex items-center justify-between gap-10 transition-all hover:translate-x-2 ${SEVERITY_COLOR[ep.severity]?.border} ${ep.severity === 'critical' && ep.status === 'open' ? 'animate-pulse-slow' : ''}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-6 mb-4">
                          <h4 className={`text-4xl font-black tracking-tighter ${ep.status === 'completed' ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-900 dark:text-white'}`}>{ep.resident}</h4>
                          <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-2xl ${ep.status === 'completed' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400' : `${SEVERITY_COLOR[ep.severity]?.bg} ${SEVERITY_COLOR[ep.severity]?.text}`}`}>
                            {ep.status === 'completed' ? 'Resolved' : `ALERT_${ep.severity?.toUpperCase()}`}
                          </span>
                          {ep.status === 'open' && <div className={`w-3 h-3 rounded-full ${SEVERITY_COLOR[ep.severity]?.pulse} shadow-[0_0_15px_rgba(239,68,68,0.5)]`} />}
                        </div>
                        <div className="flex flex-wrap items-center gap-6 text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                          <p className="bg-zinc-50 dark:bg-zinc-800 px-3 py-1 rounded-lg">Type: <span className={ep.status === 'completed' ? 'text-zinc-400' : 'text-zinc-900 dark:text-white'}>{ep.type}</span></p>
                          <span className="opacity-20 text-2xl">/</span>
                          <p>Staff Assigned: <span className="text-indigo-500">{ep.recommended}</span></p>
                          <span className="opacity-20 text-2xl">/</span>
                          <p>Fatigue Level: <span className="text-fuchsia-500">{ep.recommended_fatigue?.toFixed(1)}%</span></p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-4 shrink-0">
                        {ep.status === 'open' ? (
                          <button
                            onClick={() => handleComplete(ep.id, ep.caregiver_id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg transition-all active:scale-95"
                          >
                            Mark Complete
                          </button>
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
