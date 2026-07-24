export default function StatCard({ label, value, sub, icon: Icon, tone = "default" }) {
  const toneClasses = {
    default: "bg-surface border-line",
    gold: "bg-gold-soft/60 border-gold/30",
    sage: "bg-sage-soft/60 border-sage/30",
    brick: "bg-brick-soft/60 border-brick/30",
  };

  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
        {Icon && <Icon size={16} strokeWidth={1.75} className="text-muted" />}
      </div>
      <div className="font-display text-2xl mt-2 text-foreground font-mono-num">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}
