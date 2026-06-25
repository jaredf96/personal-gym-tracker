import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { getExerciseHistoryWithPRs } from "../engine/analysis";
import { getSettings } from "../db/repo";
import { fmtNum, fmtWeight } from "../lib/format";
import { relativeDay } from "../lib/dates";
import { ScreenHeader, Empty, Pill, TrendPill } from "../components/ui";

export default function ExerciseHistoryScreen() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();

  const data = useLiveQuery(async () => {
    if (!exerciseId) return null;
    const [history, settings] = await Promise.all([
      getExerciseHistoryWithPRs(exerciseId),
      getSettings(),
    ]);
    return { history, settings };
  }, [exerciseId]);

  if (!data) return <div className="screen">Loading…</div>;
  if (!data.history) {
    return (
      <div className="screen">
        <ScreenHeader title="Exercise" />
        <Empty>Exercise not found.</Empty>
      </div>
    );
  }

  const { history, settings } = data;
  const unit = settings.unit;
  const { exercise, entries } = history;

  // All-time bests across the logged history.
  const bestWeight = Math.max(0, ...entries.map((e) => e.stats.topWeight));
  const bestVolume = Math.max(0, ...entries.map((e) => e.stats.totalVolume));
  const bestEst1rm = Math.max(0, ...entries.map((e) => e.stats.bestEst1rm));

  // Volume sparkline, oldest -> newest.
  const chrono = [...entries].reverse();
  const maxVol = Math.max(1, ...chrono.map((e) => e.stats.totalVolume));

  return (
    <div className="screen">
      <ScreenHeader
        title={exercise.name}
        subtitle={`${exercise.primaryMuscle} · ${exercise.movementPattern}`}
        right={
          <button className="btn-sm" onClick={() => navigate(-1)}>
            ‹ Back
          </button>
        }
      />

      {entries.length === 0 ? (
        <Empty>No sessions logged for this exercise yet.</Empty>
      ) : (
        <>
          <div className="card">
            <h3 className="mb">Personal records</h3>
            <div className="row wrap">
              <Pill tone="accent">🏆 Top weight {fmtWeight(bestWeight, unit)}</Pill>
              <Pill tone="accent">
                📊 Best volume {fmtNum(bestVolume)} {unit}
              </Pill>
              <Pill tone="accent">≈1RM {fmtNum(Math.round(bestEst1rm))}</Pill>
            </div>
          </div>

          {chrono.length > 1 && (
            <div className="card">
              <div className="row between mb">
                <h3>Volume trend</h3>
                <span className="faint tiny">{chrono.length} sessions</span>
              </div>
              <div className="spark">
                {chrono.map((e) => (
                  <div
                    key={e.session.id}
                    className={`spark-bar${e.stats.totalVolume >= maxVol ? " best" : ""}`}
                    style={{ height: `${Math.max(6, (e.stats.totalVolume / maxVol) * 100)}%` }}
                    title={`${relativeDay(e.session.date)}: ${fmtNum(e.stats.totalVolume)} ${unit}`}
                  />
                ))}
              </div>
            </div>
          )}

          <h3 className="mt-lg mb">Sessions</h3>
          {entries.map((e) => (
            <div key={e.session.id} className="card">
              <div className="row between">
                <div>
                  <div style={{ color: "var(--text)" }}>{relativeDay(e.session.date)}</div>
                  <div className="faint tiny">{e.session.date}</div>
                </div>
                <TrendPill trend={e.trendVsPrev} />
              </div>
              <div className="row wrap mt small">
                <Pill>{e.stats.setCount} sets</Pill>
                <Pill>{e.stats.totalReps} reps</Pill>
                <Pill>top {fmtWeight(e.stats.topWeight, unit)}</Pill>
                <Pill>
                  {fmtNum(e.stats.totalVolume)} {unit} vol
                </Pill>
                {e.stats.bestSet && (
                  <Pill>
                    best {fmtNum(e.stats.bestSet.weight)}×{e.stats.bestSet.reps}
                  </Pill>
                )}
              </div>
              {(e.isWeightPR || e.isVolumePR || e.isEst1rmPR) && (
                <div className="row wrap mt">
                  {e.isWeightPR && <Pill tone="amber">🏆 Weight PR</Pill>}
                  {e.isVolumePR && <Pill tone="amber">📊 Volume PR</Pill>}
                  {e.isEst1rmPR && <Pill tone="amber">💪 1RM PR</Pill>}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
