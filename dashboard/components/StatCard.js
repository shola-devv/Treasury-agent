export default function StatCard({ label, value, unit, hint, accent = "amber" }) {
  const dot = {
    amber: "bg-amber-400",
    sage: "bg-sage-400",
    plum: "bg-plum-400",
    rust: "bg-rust-400",
  }[accent];

  return (
    <div className="rounded-4xl border border-ink/5 bg-white/70 p-6 shadow-card backdrop-blur-sm">
      <div className="flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-wide text-clay">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-3xl text-ink">{value}</span>
        {unit && <span className="font-body text-sm text-clay">{unit}</span>}
      </div>
      {hint && <p className="mt-2 font-body text-xs text-clay">{hint}</p>}
    </div>
  );
}
