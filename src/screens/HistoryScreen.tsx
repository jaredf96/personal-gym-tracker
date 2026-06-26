import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { getLoggedExercises } from "../db/repo";
import { ScreenHeader, Empty, Pill } from "../components/ui";

export default function HistoryScreen() {
  const exercises = useLiveQuery(() => getLoggedExercises(), []);

  if (!exercises) return <div className="screen">Loading…</div>;

  // Group by primary muscle for a tidy list.
  const byMuscle = new Map<string, typeof exercises>();
  for (const e of [...exercises].sort((a, b) => a.name.localeCompare(b.name))) {
    const muscle = e.primaryMuscles[0] ?? "Other";
    const list = byMuscle.get(muscle) ?? [];
    list.push(e);
    byMuscle.set(muscle, list);
  }

  return (
    <div className="screen">
      <ScreenHeader title="History" subtitle="Exercises you've logged" />

      {exercises.length === 0 ? (
        <Empty>No logged exercises yet. Finish a workout to build history.</Empty>
      ) : (
        [...byMuscle.entries()].map(([muscle, list]) => (
          <div key={muscle} className="card">
            <div className="row between mb">
              <h3>{muscle}</h3>
              <Pill>{list.length}</Pill>
            </div>
            {list.map((e) => (
              <Link key={e.id} to={`/exercises/${e.id}`} className="list-row">
                <div>
                  <div style={{ color: "var(--text)" }}>{e.name}</div>
                  <div className="faint tiny">{e.movementPattern}</div>
                </div>
                <span className="muted">›</span>
              </Link>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
