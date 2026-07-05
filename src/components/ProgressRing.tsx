interface Props {
  value: number; // current amount (e.g. weekly hard sets)
  target: number; // the prescribed target (ring is full at target)
  size?: number;
  stroke?: number;
  color: string; // ring color (status-driven)
  children?: React.ReactNode; // center content
}

// Minimal SVG progress ring. Fill = value/target, clamped; over-target keeps a
// full ring (the color communicates "high").
export default function ProgressRing({
  value,
  target,
  size = 74,
  stroke = 7,
  color,
  children,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
