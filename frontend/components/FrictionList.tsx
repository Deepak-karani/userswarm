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
  const marker =
    variant === "reco" ? "text-emerald-500" : "text-rose-500";
  return (
    <div>
      {title && (
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
          {title}
        </p>
      )}
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700">
            <span className={`mt-0.5 ${marker}`}>
              {variant === "reco" ? "→" : "•"}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
