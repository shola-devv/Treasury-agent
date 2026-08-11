const STYLES = {
  pay: "bg-sage-50 text-sage-600",
  completed: "bg-sage-50 text-sage-600",
  hold: "bg-amber-50 text-amber-600",
  waiting: "bg-amber-50 text-amber-600",
  pending: "bg-amber-50 text-amber-600",
  failed: "bg-rust-50 text-rust-600",
  stalled: "bg-rust-50 text-rust-600",
  not_configured: "bg-clay/10 text-clay",
  neutral: "bg-clay/10 text-clay",
  running: "bg-sage-50 text-sage-600",
};

const LABELS = {
  pay: "Paid",
  completed: "Confirmed",
  hold: "Held",
  waiting: "Waiting",
  pending: "Pending",
  failed: "Failed",
  stalled: "Stalled",
  not_configured: "Not configured",
  running: "Running",
};

export default function Badge({ tone = "neutral", children }) {
  const style = STYLES[tone] ?? STYLES.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-xs font-semibold ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children ?? LABELS[tone] ?? tone}
    </span>
  );
}
