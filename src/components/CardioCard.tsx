import { useState } from "react";
import { addCardioLog } from "../db/repo";
import { todayISODate } from "../lib/dates";
import { useToast } from "./Toast";

// Quick cardio logger. Shown on cardio days (and always available) so cardio
// becomes a real, dated entry alongside lifts.
export default function CardioCard({ suggestedMinutes }: { suggestedMinutes?: number }) {
  const toast = useToast();
  const [minutes, setMinutes] = useState(suggestedMinutes ? String(suggestedMinutes) : "");
  const [kind, setKind] = useState("Zone 2");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  async function save() {
    const m = parseInt(minutes, 10);
    if (!Number.isFinite(m) || m <= 0) return;
    await addCardioLog({ date: todayISODate(), minutes: m, kind, notes: notes || undefined });
    toast.show("Cardio logged");
    setMinutes("");
    setNotes("");
    setOpen(false);
  }

  return (
    <div className="card">
      <div className="row between" onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
        <h3>🚴 Log cardio</h3>
        <span className="muted small">{open ? "▾" : "▸"}</span>
      </div>
      {open && (
        <div className="mt">
          <div className="row" style={{ gap: 8 }}>
            <label className="field grow">
              Minutes
              <input
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="35"
              />
            </label>
            <label className="field grow">
              Type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option>Zone 2</option>
                <option>Steady state</option>
                <option>Intervals</option>
                <option>Walk</option>
                <option>Other</option>
              </select>
            </label>
          </div>
          <input
            className="mt"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button className="btn-primary btn-block mt" onClick={save} disabled={minutes === ""}>
            Save cardio
          </button>
        </div>
      )}
    </div>
  );
}
