export const SEVERITY_COLOR = {
  emergency: { bg: "bg-black dark:bg-zinc-950", border: "border-rose-600", badge: "bg-rose-600", text: "text-rose-600 dark:text-rose-500", pulse: "bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.8)]" },
  critical: { bg: "bg-red-500/10", border: "border-red-500/50", badge: "bg-red-600", text: "text-red-600 dark:text-red-400", pulse: "bg-red-500" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/50", badge: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", pulse: "bg-amber-500" },
  info: { bg: "bg-indigo-500/10", border: "border-indigo-500/50", badge: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400", pulse: "bg-indigo-500" },
};

export const STATUS_COLOR = {
  available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30",
  attending: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30",
  rounds: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30",
  break: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-500/30",
  out: "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/30",
};

export const IMAGES = {
  hero: "/assets/images/hero.png",
  male: "/assets/images/male.png",
  female: "/assets/images/female.png",
  logo: "/assets/images/logo.png"
};

export const FATIGUE_COLOR = {
  Low: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", bar: "#10b981", badge: "bg-emerald-500" },
  Moderate: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", bar: "#f59e0b", badge: "bg-amber-500" },
  High: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", bar: "#f43f5e", badge: "bg-rose-500" },
  Critical: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-600 dark:text-fuchsia-400", bar: "#d946ef", badge: "bg-fuchsia-500" },
};

export const RANK_STYLES = {
  primary: { border: "border-indigo-500 dark:border-indigo-400", badge: "bg-indigo-600", label: "🌟 Elite Dispatch" },
  secondary: { border: "border-zinc-300 dark:border-zinc-700", badge: "bg-zinc-600", label: "Qualified Alternate" },
  backup: { border: "border-zinc-200 dark:border-zinc-800", badge: "bg-zinc-400", label: "Reserve Unit" },
};

export function getVibeTag(cg, fatigue) {
  const score = fatigue?.fatigue_score || 0;
  if (score < 15 && cg.status === 'available') return { label: "Peak Efficiency", icon: "🚀", color: "text-emerald-500 bg-emerald-500/10" };
  if (score < 40) return { label: "Fully Balanced", icon: "⚖️", color: "text-indigo-500 bg-indigo-500/10" };
  if (score < 70) return { label: "Steady Load", icon: "📊", color: "text-amber-500 bg-amber-500/10" };
  return { label: "Break Needed", icon: "☕", color: "text-rose-500 bg-rose-500/10" };
}
