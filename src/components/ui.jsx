export function Card({ as: Component = "div", className = "", children, ...props }) {
  return (
    <Component
      className={`rounded-2xl border border-aqua-soft/70 bg-surface shadow-marine dark:border-white/10 dark:bg-dark-surface ${className}`}
      {...props}>
      {children}
    </Component>
  );
}

export function Badge({ tone = "primary", className = "", children, ...props }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    steel: "bg-steel/10 text-ink",
    amber: "bg-amber/45 text-amber-ink",
    coral: "bg-coral/15 text-coral-ink"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone] ?? tones.primary} ${className}`}
      {...props}>
      {children}
    </span>
  );
}

export function IconButton({ className = "", children, ...props }) {
  return (
    <button
      type="button"
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/30 bg-surface text-primary transition duration-200 hover:border-primary hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-dark-surface ${className}`}
      {...props}>
      {children}
    </button>
  );
}

export function Button({ variant = "primary", className = "", children, ...props }) {
  const variants = {
    primary: "border-primary bg-primary text-white hover:bg-ink",
    secondary: "border-aqua-soft bg-surface text-ink-strong hover:border-primary hover:bg-aqua-soft/25 dark:bg-dark-surface dark:text-dark-ink",
    quiet: "border-transparent bg-transparent text-steel hover:bg-aqua-soft/30 hover:text-primary"
  };

  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant] ?? variants.primary} ${className}`}
      {...props}>
      {children}
    </button>
  );
}

export function StatTile({ icon: Icon, label, value, className = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 rounded-xl bg-aqua-soft/25 px-3 py-2.5 dark:bg-white/[0.06] ${className}`}>
      {Icon && <Icon size={16} className="shrink-0 text-primary" />}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-steel">{label}</p>
        <p className="truncate text-sm font-bold tabular-nums text-ink-strong dark:text-dark-ink">{value}</p>
      </div>
    </div>
  );
}
