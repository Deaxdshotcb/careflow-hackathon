export default function Bar({ label, value, color = "#6366f1" }) {
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
