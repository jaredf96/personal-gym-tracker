import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import {
  getActiveSession,
  getNextTemplate,
  getSettings,
  listTemplates,
  startSession,
} from "../db/repo";
import { analyzeSession } from "../engine/analysis";
import { upcomingTemplates } from "../engine/rotation";
import { relativeDay } from "../lib/dates";
import { fmtNum } from "../lib/format";
import { ScreenHeader, Pill } from "../components/ui";
import ReadinessCard from "../components/ReadinessCard";

export default function TodayScreen() {
  const navigate = useNavigate();

  const data = useLiveQuery(async () => {
    const [templates, next, active, settings] = await Promise.all([
      listTemplates(),
      getNextTemplate(),
      getActiveSession(),
      getSettings(),
    ]);
    const upcoming = upcomingTemplates(templates, next.lastCompleted, 4);
    const lastSummary = next.lastCompleted
      ? await analyzeSession(next.lastCompleted.id)
      : null;
    return { templates, next, active, upcoming, lastSummary, settings };
  }, []);

  if (!data) return <div className="screen">Loading…</div>;
  const { templates, next, active, upcoming, lastSummary, settings } = data;

  async function start(templateId: string | undefined) {
    if (!templateId) return;
    const s = await startSession(templateId);
    navigate(`/workout/${s.id}`);
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="screen">
      <ScreenHeader title="Today" subtitle={today} />

      {/* Active session takes priority */}
      {active ? (
        <div className="card" style={{ borderColor: "var(--accent-dim)" }}>
          <div className="row between">
            <div>
              <div className="muted small">Workout in progress</div>
              <h2>{templateName(active.templateId, upcoming, next.template?.name)}</h2>
            </div>
            <Pill tone="accent">Live</Pill>
          </div>
          <button
            className="btn-primary btn-block btn-lg mt"
            onClick={() => navigate(`/workout/${active.id}`)}
          >
            Resume workout →
          </button>
        </div>
      ) : (
        <div className="card" style={{ borderColor: "var(--accent-dim)" }}>
          <div className="muted small">Next in your rotation</div>
          <h2 style={{ marginTop: 2 }}>{next.template?.name ?? "No workout"}</h2>
          <div className="muted small mt">
            Sequence-based — do this whenever you train next, no calendar required.
          </div>
          <button
            className="btn-primary btn-block btn-lg mt"
            onClick={() => start(next.template?.id)}
            disabled={!next.template}
          >
            Start {next.template?.name} →
          </button>
        </div>
      )}

      {/* Start any specific day (rotation is just the default) */}
      {!active && (
        <div className="card">
          <h3 className="mb">Or start a specific workout</h3>
          <div className="row wrap" style={{ gap: 8 }}>
            {templates.map((t) => (
              <button
                key={t.id}
                className="btn-sm grow"
                style={{ minWidth: 110 }}
                onClick={() => start(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rotation preview */}
      <div className="card">
        <h3 className="mb">Rotation</h3>
        <div className="row wrap">
          {upcoming.map((t, i) => (
            <Pill key={t.id} tone={i === 0 ? "accent" : "default"}>
              {i === 0 ? "Next: " : ""}
              {t.name}
            </Pill>
          ))}
        </div>
        <div className="faint tiny mt">Upper A → Lower A → Upper B → Lower B → repeat</div>
      </div>

      {/* Last session recap */}
      {lastSummary && (
        <div className="card">
          <div className="row between">
            <h3>Last session</h3>
            <span className="muted small">
              {lastSummary.template?.name} · {relativeDay(lastSummary.session.date)}
            </span>
          </div>
          <div className="row wrap mt">
            <Pill>{lastSummary.totals.workingSets} sets</Pill>
            <Pill>{lastSummary.totals.totalReps} reps</Pill>
            <Pill>
              {fmtNum(lastSummary.totals.totalVolume)} {settings.unit} volume
            </Pill>
            {lastSummary.exercises.filter((e) => e.comparison.trend === "improved").length > 0 && (
              <Pill tone="green">
                {lastSummary.exercises.filter((e) => e.comparison.trend === "improved").length} up ▲
              </Pill>
            )}
          </div>
        </div>
      )}

      <ReadinessCard />
    </div>
  );
}

function templateName(
  templateId: string,
  upcoming: { id: string; name: string }[],
  fallback?: string
): string {
  return upcoming.find((t) => t.id === templateId)?.name ?? fallback ?? "Workout";
}
