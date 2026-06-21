/**
 * Thermal streamline field — the page signature.
 * Cool persona streamlines drift across a dark field; friction blooms as heat.
 * Purely decorative; respects prefers-reduced-motion via globals.css.
 */
export default function SwarmField() {
  const lines = [16, 30, 44, 58, 72, 86];
  const dots = Array.from({ length: 7 });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="sl" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5BA7E6" stopOpacity="0" />
            <stop offset="0.5" stopColor="#5BA7E6" stopOpacity="0.30" />
            <stop offset="1" stopColor="#5BA7E6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {lines.map((y, i) => (
          <path
            key={i}
            d={`M0 ${y} C 28 ${y - 5}, 72 ${y + 5}, 100 ${y}`}
            fill="none"
            stroke="url(#sl)"
            strokeWidth="0.35"
          />
        ))}
      </svg>

      {/* drifting personas */}
      {dots.map((_, i) => (
        <span
          key={i}
          className="streamline absolute h-1.5 w-1.5 rounded-full bg-cool-soft"
          style={{
            top: `${12 + i * 11}%`,
            boxShadow: "0 0 10px 2px rgba(91,167,230,0.5)",
            animationDuration: `${10 + i * 1.6}s`,
            animationDelay: `${i * 1.3}s`,
          }}
        />
      ))}

      {/* friction blooming as heat */}
      <span
        className="heatspot absolute rounded-full blur-2xl"
        style={{
          top: "18%", left: "66%", height: "11rem", width: "11rem",
          background: "radial-gradient(circle, rgba(240,104,60,0.40), transparent 70%)",
          animationDuration: "5s",
        }}
      />
      <span
        className="heatspot absolute rounded-full blur-2xl"
        style={{
          top: "56%", left: "38%", height: "8rem", width: "8rem",
          background: "radial-gradient(circle, rgba(229,72,77,0.34), transparent 70%)",
          animationDuration: "6.5s", animationDelay: "1.5s",
        }}
      />
      {/* fade into the page bottom */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
    </div>
  );
}
