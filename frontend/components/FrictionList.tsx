export default function FrictionList({
  items,
  title,
  variant = "friction",
}: {
  items: string[];
  title?: string;
  variant?: "friction" | "reco";
}) {
  if (!items?.length) return null;
  // Friction radiates heat; recommendations point forward in cool.
  const marker = variant === "reco" ? "text-cool" : "text-heat-med";
  return (
    <div>
      {title && (
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-fog-muted">
          {title}
        </p>
      )}
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-fog">
            <span className={`mt-0.5 font-mono ${marker}`}>
              {variant === "reco" ? "→" : "•"}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
