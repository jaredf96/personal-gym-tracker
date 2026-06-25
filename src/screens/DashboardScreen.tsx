import { useLiveQuery } from "dexie-react-hooks";
import { getWeeklyVolume, listBodyMetrics, getSettings } from "../db/repo";
import { startOfWeek, endOfWeek, daysAgo } from "../lib/dates";
import { fmtNum } from "../lib/format";
import { ScreenHeader, Empty, VolumePill } from "../components/ui";

export default function DashboardScreen() {
  const data = useLiveQuery(async () => {
    const [volume, metrics, settings] = await Promise.all([
      getWeeklyVolume(),
      listBodyMetrics(),
      getSettings(),
    ]);
    return { volume, metrics, settings };
  }, []);

  if (!data) return <div className="screen">Loading…</div>;
  const { volume, metrics, settings } = data;
  const unit = settings.unit;

  const inRange = volume.filter((v) => v.status === "in-range").length;
  const low = volume.filter((v) => v.status === "low").length;
  const high = volume.filter((v) => v.status === "high").length;

  const ws = startOfWeek();
  const we = endOfWeek();
  const weekLabel = `${ws.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${we.toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" }
  )}`;

  // Bodyweight: latest + 7-day average.
  const bw = metrics.filter((m) => typeof m.bodyweight === "number");
  const latestBw = bw[0]?.bodyweight ?? null;
  const recentBw = bw.filter((m) => daysAgo(m.date) <= 7).map((m) => m.bodyweight!);
  const weeklyAvgBw =
    recentBw.length > 0
      ? Math.round((recentBw.reduce((a, b) => a + b, 0) / recentBw.length) * 10) / 10
      : null;

  return (
    <div className="screen">
      <ScreenHeader title="Progress" subtitle={`This week · ${weekLabel}`} />

      <div className="card">
        <div className="row wrap">
          <span className="pill green">{inRange} in range</span>
          <span className="pill amber">{low} low</span>
          <span className="pill red">{high} high</span>
        </div>
      </div>

      <h3 className="mt-lg mb">Weekly hard sets by muscle</h3>
      {volume.length === 0 ? (
        <Empty>No sets logged this week.</Empty>
      ) : (
        volume.map((v) => {
          const min = v.target?.minSets ?? 0;
          const max = v.target?.maxSets ?? 0;
          const axisMax = Math.max(max, v.hardSets, 1) * 1.25;
          const fillColor =
            v.status === "in-range"
              ? "var(--green)"
              : v.status === "low"
              ? "var(--amber)"
              : v.status === "high"
              ? "var(--red)"
              : "var(--text-faint)";
          return (
            <div key={v.muscle} className="card">
              <div className="row between">
                <h3>{v.muscle}</h3>
                <VolumePill status={v.status} />
              </div>
              <div className="row between small muted" style={{ marginTop: 2 }}>
                <span>
                  {v.hardSets} set{v.hardSets === 1 ? "" : "s"}
                </span>
                {v.target ? (
                  <span>
                    target {min}–{max}
                  </span>
                ) : (
                  <span className="faint">no target</span>
                )}
              </div>
              <div className="vbar-track mt">
                {v.target && (
                  <div
                    className="vbar-range"
                    style={{
                      left: `${(min / axisMax) * 100}%`,
                      width: `${((max - min) / axisMax) * 100}%`,
                    }}
                  />
                )}
                <div
                  className="vbar-fill"
                  style={{
                    width: `${Math.min(100, (v.hardSets / axisMax) * 100)}%`,
                    background: fillColor,
                  }}
                />
              </div>
            </div>
          );
        })
      )}

      {latestBw != null && (
        <div className="card mt-lg">
          <h3 className="mb">Bodyweight</h3>
          <div className="row wrap">
            <span className="pill accent">
              Latest {fmtNum(latestBw)} {unit}
            </span>
            {weeklyAvgBw != null && (
              <span className="pill">
                7-day avg {fmtNum(weeklyAvgBw)} {unit}
              </span>
            )}
            <span className="pill">{bw.length} entries</span>
          </div>
          <div className="faint tiny mt">Log bodyweight from Settings.</div>
        </div>
      )}
    </div>
  );
}
