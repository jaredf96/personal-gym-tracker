import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db } from "../db/db";
import {
  getActiveSession,
  getNextTemplate,
  getSettings,
  getWeeklySchedule,
  listTemplates,
  startSession,
} from "../db/repo";
import { analyzeSession } from "../engine/analysis";
import { describeDate, type DayDescriptor } from "../engine/schedule";
import { getDeloadAssessment } from "../engine/deload";
import { todayISODate, relativeDay } from "../lib/dates";
import { fmtNum } from "../lib/format";
import { ScreenHeader, Pill } from "../components/ui";
import ReadinessCard from "../components/ReadinessCard";
import CardioCard from "../components/CardioCard";
import type { WorkoutTemplate } from "../types";

export default function TodayScreen() {
  const navigate = useNavigate();

  const data = useLiveQuery(async () => {
    const [templates, schedule, sessions, active, settings, nextInfo] = await Promise.all([
      listTemplates(),
      getWeeklySchedule(),
      db.workoutSessions.toArray(),
      getActiveSession(),
      getSettings(),
      getNextTemplate(),
    ]);
    const tomorrowDate = todayISODate(new Date(Date.now() + 86_400_000));
    const today = describeDate(todayISODate(), schedule, templates, sessions);
    const tomorrow = describeDate(tomorrowDate, schedule, templates, sessions);
    const lastSummary = nextInfo.lastCompleted
      ? await analyzeSession(nextInfo.lastCompleted.id)
      : null;
    const deload = await getDeloadAssessment();
    return { templates, today, tomorrow, nextLift: nextInfo.template, active, settings, lastSummary, deload };
  }, []);

  if (!data) return <div className="screen">Loading…</div>;
  const { templates, today, tomorrow, nextLift, active, settings, lastSummary, deload } = data;

  async function start(templateId: string | undefined) {
    if (!templateId) return;
    const s = await startSession(templateId);
    navigate(`/workout/${s.id}`);
  }

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="screen">
      <ScreenHeader title="Today" subtitle={dateLabel} />

      {deload.recommended && (
        <div className="card" style={{ borderColor: "var(--amber)" }}>
          <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
            <span>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: "var(--amber)" }}>Deload suggested</div>
              <div className="small muted">{deload.reasons.join(" · ")}</div>
              {deload.prescription && <div className="small mt">{deload.prescription}</div>}
            </div>
          </div>
        </div>
      )}

      {active ? (
        <ActiveCard
          templates={templates}
          templateId={active.templateId}
          onResume={() => navigate(`/workout/${active.id}`)}
        />
      ) : (
        <PlanCard today={today} nextLift={nextLift} onStart={start} />
      )}

      {/* Tomorrow preview */}
      <div className="card">
        <div className="row between">
          <h3>Tomorrow</h3>
          <TomorrowChip d={tomorrow} />
        </div>
      </div>

      {/* Cardio quick-log (prominent on cardio days, available any day) */}
      {(today.isCardioDay || today.completed) && (
        <CardioCard suggestedMinutes={today.cardioMinMinutes} />
      )}

      {/* Start any specific day */}
      {!active && (
        <div className="card">
          <h3 className="mb">Or start a specific workout</h3>
          <div className="row wrap" style={{ gap: 8 }}>
            {templates.map((t) => (
              <button
                key={t.id}
                className="btn-sm grow"
                style={{ minWidth: 110, borderColor: t.color, color: t.color }}
                onClick={() => start(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
          </div>
        </div>
      )}

      <ReadinessCard />
    </div>
  );
}

function PlanCard({
  today,
  nextLift,
  onStart,
}: {
  today: DayDescriptor;
  nextLift: WorkoutTemplate | null;
  onStart: (id: string | undefined) => void;
}) {
  // Already trained today.
  if (today.completed && today.completedTemplate) {
    const t = today.completedTemplate;
    return (
      <div className="card" style={{ borderColor: t.color }}>
        <div className="muted small">Today — done ✓</div>
        <h2 style={{ color: t.color }}>{t.name}</h2>
        <div className="muted small mt">Nice work. Rest up and check tomorrow's plan below.</div>
      </div>
    );
  }

  // Scheduled workout day.
  if (today.isWorkoutDay) {
    const t = today.plannedTemplate ?? nextLift;
    return (
      <div className="card" style={{ borderColor: t?.color ?? "var(--accent-dim)" }}>
        <div className="muted small">Today — workout</div>
        <h2 style={{ color: t?.color }}>{t?.name ?? "Workout"}</h2>
        <button
          className="btn-primary btn-block btn-lg mt"
          style={t ? { background: t.color, borderColor: t.color } : undefined}
          onClick={() => onStart(t?.id)}
          disabled={!t}
        >
          Start {t?.name} →
        </button>
      </div>
    );
  }

  // Cardio or rest day — still let them lift if they want.
  return (
    <div className="card" style={{ borderColor: today.isCardioDay ? "var(--green)" : "var(--border)" }}>
      <div className="muted small">Today</div>
      <h2>{today.isCardioDay ? today.scheduleLabel : "Full rest"}</h2>
      <div className="muted small mt">
        {today.isCardioDay
          ? `Planned: ${today.cardioMinMinutes ?? ""}–${today.cardioMaxMinutes ?? ""} min Zone 2.${
              today.note ? " " + today.note : ""
            }`
          : "No lifting scheduled — walking / mobility only."}
      </div>
      {nextLift && (
        <button className="btn btn-block mt" onClick={() => onStart(nextLift.id)} style={{ borderColor: nextLift.color, color: nextLift.color }}>
          Lift anyway — start {nextLift.name}
        </button>
      )}
    </div>
  );
}

function ActiveCard({
  templates,
  templateId,
  onResume,
}: {
  templates: WorkoutTemplate[];
  templateId: string;
  onResume: () => void;
}) {
  const t = templates.find((x) => x.id === templateId);
  return (
    <div className="card" style={{ borderColor: t?.color ?? "var(--accent-dim)" }}>
      <div className="row between">
        <div>
          <div className="muted small">Workout in progress</div>
          <h2 style={{ color: t?.color }}>{t?.name ?? "Workout"}</h2>
        </div>
        <Pill tone="accent">Live</Pill>
      </div>
      <button
        className="btn-primary btn-block btn-lg mt"
        style={t ? { background: t.color, borderColor: t.color } : undefined}
        onClick={onResume}
      >
        Resume workout →
      </button>
    </div>
  );
}

function TomorrowChip({ d }: { d: DayDescriptor }) {
  if (d.isWorkoutDay && d.plannedTemplate) {
    return <Pill tone="default"><span style={{ color: d.plannedTemplate.color }}>{d.plannedTemplate.name}</span></Pill>;
  }
  if (d.isCardioDay) return <Pill tone="green">{d.scheduleLabel}</Pill>;
  return <Pill>Rest</Pill>;
}
