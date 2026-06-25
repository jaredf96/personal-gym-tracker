import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../lib/dates";

interface Props {
  endAt: number; // epoch ms when rest is over
  onExtend: (seconds: number) => void;
  onSkip: () => void;
}

// Sticky rest countdown shown after logging a set. Self-ticking; the parent owns
// the target end time so it survives re-renders and set edits.
export default function RestTimer({ endAt, onExtend, onSkip }: Props) {
  const [now, setNow] = useState(Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, endAt - now);
  const remaining = Math.ceil(remainingMs / 1000);
  const done = remainingMs <= 0;

  useEffect(() => {
    if (done && !buzzed.current) {
      buzzed.current = true;
      if ("vibrate" in navigator) navigator.vibrate?.(200);
    }
    if (!done) buzzed.current = false;
  }, [done]);

  return (
    <div className="rest-bar">
      <div className="row" style={{ gap: 10 }}>
        <span className="rest-time" style={{ color: done ? "var(--green)" : "var(--text)" }}>
          {done ? "Rest done" : formatDuration(remaining)}
        </span>
        {!done && <span className="muted small">resting</span>}
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
