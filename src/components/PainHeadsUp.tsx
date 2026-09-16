import { CLEAR_AFTER_CLEAN_SESSIONS, type PainAdjustment } from "../engine/painNotes";
import { relativeDay } from "../lib/dates";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Recent pain notes turned into prep for this workout: a short stretch /
// activation list per area and one extra warm-up set on the lifts that load it.
// Weights are untouched. `listLifts` names those lifts (Today, where no exercise
// cards are showing); the logger marks them on each card instead.
export default function PainHeadsUp({
  adjustments,
  listLifts = false,
}: {
  adjustments: PainAdjustment[];
  listLifts?: boolean;
}) {
  if (adjustments.length === 0) return null;
  return (
    <div className="card" style={{ borderColor: "var(--amber)" }}>
      <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        <span>🩹</span>
        <div className="grow">
          <div style={{ fontWeight: 600, color: "var(--amber)" }}>Heads-up from your notes</div>
          {adjustments.map((a) => {
            const left = CLEAR_AFTER_CLEAN_SESSIONS - a.cleanSessionsSince;
            return (
              <div key={a.area} className="mt">
                <div className="small">
                  <strong>{capitalize(a.label)}</strong>{" "}
                  <span className="muted">
                    · {relativeDay(a.lastNoted).toLowerCase()}: “{a.quote}”
                  </span>
                </div>
                <div className="small mt" style={{ marginTop: 4 }}>
                  Before you start: {a.prep.join(" · ")}
                </div>
                <div className="faint tiny" style={{ marginTop: 4 }}>
                  {listLifts
                    ? `+1 warm-up set on ${a.affected.map((e) => e.name).join(", ")}.`
                    : `+1 warm-up set on the ${a.affected.length === 1 ? "lift" : `${a.affected.length} lifts`} marked below.`}{" "}
                  Clears after {left} more pain-free session{left === 1 ? "" : "s"} that train{left === 1 ? "s" : ""} it.
                </div>
              </div>
            );
          })}
          <div className="faint tiny mt">
            A cue to adjust, not a diagnosis. If it's sharp or getting worse, skip that movement.
          </div>
        </div>
      </div>
    </div>
  );
}
