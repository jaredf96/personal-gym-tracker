import { useLiveQuery } from "dexie-react-hooks";
import { getWeeklyVolume, listBodyMetrics, getSettings } from "../db/repo";
import { startOfWeek, endOfWeek, daysAgo } from "../lib/dates";
import { fmtNum } from "../lib/format";
import { ScreenHeader, Empty } from "../components/ui";
import ProgressRing from "../components/ProgressRing";
import ScreenSkeleton from "../components/Skeleton";
import type { VolumeStatus } from "../engine/volume";

const STATUS_COLOR: Record<VolumeStatus, string> = {
  "in-range": "var(--green)",
  low: "var(--amber)",
  high: "var(--red)",
  "no-target": "var(--text-faint)",
};

export default function DashboardScreen() {
  const data = useLiveQuery(async () => {
    const [volume, metrics, settings] = await Promise.all([
      getWeeklyVolume(),
      listBodyMetrics(),
      getSettings(),
    ]);
    return { volume, metrics, settings };
  }, []);

  if (!data) return <ScreenSkeleton />;
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

  const targeted = volume.filter((v) => v.target);
  const untargeted = volume.filter((v) => !v.target && v.hardSets > 0);

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

      <div className="card">
        <h3 className="mb">Weekly hard sets</h3>
        {targeted.length === 0 ? (
          <Empty>No volume targets seeded.</Empty>
        ) : (
          <div className="ring-grid">
            {targeted.map((v) => (
              <div key={v.muscle} className="ring-cell">
                <ProgressRing
                  value={v.hardSets}
                  target={v.target!.targetSets}
                  color={STATUS_COLOR[v.status]}
                >
                  <span className="ring-value">{fmtNum(v.hardSets)}</span>
                </ProgressRing>
                <div className="ring-label">{v.label}</div>
                <div className="ring-band">
                  {v.target!.targetSets} ({v.target!.minSets}–{v.target!.maxSets})
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="faint tiny mt">
          Ring fills at the weekly target; color shows low / in range / high. Warm-ups don't count.
        </div>
      </div>

      {untargeted.length > 0 && (
        <div className="card">
          <h3 className="mb">Other work this week</h3>
          <div className="row wrap">
            {untargeted.map((v) => (
              <span key={v.muscle} className="pill">
                {v.label}: {fmtNum(v.hardSets)}
              </span>
            ))}
          </div>
        </div>
      )}

      {latestBw != null && (
        <div className="card">
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
