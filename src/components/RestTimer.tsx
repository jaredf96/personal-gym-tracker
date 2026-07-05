import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../lib/dates";

interface Props {
  endAt: number; // epoch ms when rest is over
  totalMs: number; // full rest duration (for the ring fraction)
  onExtend: (seconds: number) => void;
  onSkip: () => void;
}

const SIZE = 46;
const STROKE = 4;

// Sticky rest countdown with a circular progress ring. The parent owns the
// target end time so it survives re-renders and set edits.
export default function RestTimer({ endAt, totalMs, onExtend, onSkip }: Props) {
  const [now, setNow] = useState(Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, endAt - now);
  const remaining = Math.ceil(remainingMs / 1000);
  const done = remainingMs <= 0;
  const frac = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;

  useEffect(() => {
    if (done && !buzzed.current) {
      buzzed.current = true;
      if ("vibrate" in navigator) navigator.vibrate?.(200);
    }
    if (!done) buzzed.current = false;
  }, [done]);

  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="rest-bar">
      <div className="row" style={{ gap: 10 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            fill="none"
            stroke={done ? "var(--green)" : "var(--accent)"}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - frac)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.3s ease" }}
          />
          {done && (
            <path
              d={`M ${SIZE * 0.32} ${SIZE * 0.52} l ${SIZE * 0.12} ${SIZE * 0.12} l ${SIZE * 0.24} -${SIZE * 0.26}`}
              fill="none"
              stroke="var(--green)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <div>
          <div className="rest-time num" style={{ color: done ? "var(--green)" : "var(--text)" }}>
            {done ? "Rest done" : formatDuration(remaining)}
          </div>
          {!done && <div className="faint tiny">resting</div>}
        </div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn-sm" onClick={() => onExtend(30)}>
          +30s
        </button>
        <button className="btn-sm btn-primary" onClick={onSkip}>
          {done ? "Done" : "Skip"}
        </button>
      </div>
    </div>
  );
}
