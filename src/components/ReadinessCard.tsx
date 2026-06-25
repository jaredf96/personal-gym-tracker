import { useEffect, useState } from "react";
import { getReadinessForDate, upsertReadiness } from "../db/repo";
import { todayISODate } from "../lib/dates";
import { useToast } from "./Toast";

type Key = "sleep" | "energy" | "soreness" | "stress";
const FIELDS: { key: Key; label: string }[] = [
  { key: "sleep", label: "Sleep" },
  { key: "energy", label: "Energy" },
  { key: "soreness", label: "Soreness" },
  { key: "stress", label: "Stress" },
];

// Quick 1–5 readiness check-in for today. Feeds the AI coach context.
export default function ReadinessCard() {
  const date = todayISODate();
  const toast = useToast();
  const [vals, setVals] = useState<Record<Key, number | undefined>>({
    sleep: undefined,
    energy: undefined,
    soreness: undefined,
    stress: undefined,
  });
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getReadinessForDate(date).then((r) => {
      if (r) {
        setVals({ sleep: r.sleep, energy: r.energy, soreness: r.soreness, stress: r.stress });
        setNotes(r.notes ?? "");
        if (r.sleep || r.energy || r.soreness || r.stress) setOpen(true);
      }
    });
  }, [date]);

  async function save() {
    await upsertReadiness({ date, ...vals, notes: notes || undefined });
    toast.show("Readiness saved");
  }

  return (
    <div className="card">
      <div className="row between" onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
        <h3>Readiness check-in</h3>
        <span className="muted small">{open ? "▾" : "▸"}</span>
      </div>
      {open && (
        <div className="mt">
          {FIELDS.map((f) => (
            <div key={f.key} className="row between mb">
              <span className="small">{f.label}</span>
              <div className="row" style={{ gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className="btn-sm"
                    style={{
                      width: 36,
                      background:
                        vals[f.key] === n ? "var(--accent)" : "var(--surface-2)",
                      color: vals[f.key] === n ? "#061018" : "var(--text)",
                      borderColor: vals[f.key] === n ? "var(--accent)" : "var(--border)",
                    }}
                    onClick={() => setVals((v) => ({ ...v, [f.key]: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <input
            placeholder="Notes (e.g. slept poorly, low back tight)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button className="btn-primary btn-block mt" onClick={save}>
            Save readiness
          </button>
        </div>
      )}
    </div>
  );
}
