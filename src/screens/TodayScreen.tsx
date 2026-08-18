import { useEffect, useState, type CSSProperties } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db } from "../db/db";
import {
  getActiveSession,
  getNextTemplate,
  getSettings,
  getWeeklySchedule,
  listTemplates,
} from "../db/repo";
import { analyzeSession } from "../engine/analysis";
import { describeDate, type DayDescriptor } from "../engine/schedule";
import { getDeloadAssessment } from "../engine/deload";
import { todayISODate, relativeDay , addDaysISO } from "../lib/dates";
import { fmtNum } from "../lib/format";
import { ScreenHeader, Pill } from "../components/ui";
import ReadinessCard from "../components/ReadinessCard";
import CardioCard from "../components/CardioCard";
import ScreenSkeleton from "../components/Skeleton";
import { startWorkoutFlow } from "../lib/startWorkout";
import type { WorkoutTemplate } from "../types";

// Feeds the split color into .card.hero (border tint + colored glow).
function heroStyle(color?: string): CSSProperties {
  return color ? ({ "--hero": color } as CSSProperties) : {};
}

// Re-render when the local date changes so a PWA left open overnight rolls
// over to the new day (plan, calendar highlight, readiness date).
export function useDateKey(): string {
  const [dateKey, setDateKey] = useState(todayISODate());
  useEffect(() => {
    const id = window.setInterval(() => {
      const d = todayISODate();
      setDateKey((prev) => (prev === d ? prev : d));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return dateKey;
}

export default function TodayScreen() {
  const navigate = useNavigate();
  const dateKey = useDateKey();
  // Which split the Start button will launch. Null = follow the rotation.
  const [picked, setPicked] = useState<string | null>(null);

  const data = useLiveQuery(async () => {
    const [templates, schedule, sessions, active, settings, nextInfo] = await Promise.all([
      listTemplates(),
      getWeeklySchedule(),
      db.workoutSessions.toArray(),
      getActiveSession(),
      getSettings(),
      getNextTemplate(),
    ]);
    const tomorrowDate = addDaysISO(1);
    const today = describeDate(todayISODate(), schedule, templates, sessions);
    const tomorrow = describeDate(tomorrowDate, schedule, templates, sessions);
    const lastSummary = nextInfo.lastCompleted
      ? await analyzeSession(nextInfo.lastCompleted.id)
      : null;
    const deload = await getDeloadAssessment();
    return {
      templates,
      today,
      tomorrow,
      nextLift: nextInfo.template,
      rotationReason: nextInfo.reason,
      daysSinceLast: nextInfo.daysSinceLast,
      active,
      settings,
      lastSummary,
      deload,
    };
  }, [dateKey]);

  if (!data) return <ScreenSkeleton />;
  const { templates, today, tomorrow, nextLift, rotationReason, daysSinceLast, active, settings, lastSummary, deload } = data;

  // The plan's suggestion, unless the user has picked a different split.
  const planned = today.plannedTemplate ?? nextLift;
  const selected = templates.find((t) => t.id === picked) ?? planned;
  const isOffPlan = !!selected && !!planned && selected.id !== planned.id;

  async function start(templateId: string | undefined) {
    if (!templateId) return;
    const id = await startWorkoutFlow(templateId);
    if (id) navigate(`/workout/${id}`);
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
        <PlanCard
          today={today}
          selected={selected}
          isOffPlan={isOffPlan}
          rotationReason={rotationReason}
          daysSinceLast={daysSinceLast}
          onStart={start}
        />
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

      {/* Pick a different split — selects it, doesn't start it */}
      {!active && (
        <div className="card">
          <h3 className="mb">Choose a workout</h3>
          <div className="row wrap" style={{ gap: 8 }}>
            {templates.map((t) => {
              const isSel = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  className="btn-sm grow"
                  aria-pressed={isSel}
                  style={{
                    minWidth: 110,
                    borderColor: t.color,
                    color: isSel ? "#061018" : t.color,
                    background: isSel ? t.color : "transparent",
                    fontWeight: isSel ? 700 : 500,
                  }}
                  onClick={() => setPicked(t.id === planned?.id ? null : t.id)}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          <div className="faint tiny mt">
            {isOffPlan
              ? `Selected ${selected?.name} instead of ${planned?.name}. Tap Start above when you're ready.`
              : "Tap a split to switch, then press Start above."}
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
  selected,
  isOffPlan,
  rotationReason,
  daysSinceLast,
  onStart,
}: {
  today: DayDescriptor;
  selected: WorkoutTemplate | null;
  isOffPlan: boolean;
  rotationReason: string;
  daysSinceLast: number | null;
  onStart: (id: string | undefined) => void;
}) {
  const restartNote =
    rotationReason === "reset" && daysSinceLast != null
      ? `No training logged for ${daysSinceLast} days — restarting the cycle.`
      : null;
  // Already trained today.
  if (today.completed && today.completedTemplate) {
    const t = today.completedTemplate;
    return (
      <div className="card hero" style={heroStyle(t.color)}>
        <div className="muted small">Today — done ✓</div>
        <h2 style={{ color: t.color }}>{t.name}</h2>
        <div className="muted small mt">Nice work. Rest up and check tomorrow's plan below.</div>
      </div>
    );
  }

  // Scheduled workout day.
  if (today.isWorkoutDay) {
    const t = selected;
    return (
      <div className="card hero" style={heroStyle(t?.color)}>
        <div className="row between">
          <div className="muted small">Today — workout</div>
          {isOffPlan && <Pill tone="amber">off plan</Pill>}
        </div>
        <h2 style={{ color: t?.color }}>{t?.name ?? "Workout"}</h2>
        {restartNote && <div className="faint tiny mt">{restartNote}</div>}
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
      {selected && (
        <button
          className="btn btn-block mt"
          onClick={() => onStart(selected.id)}
          style={{ borderColor: selected.color, color: selected.color }}
        >
          Lift anyway — start {selected.name}
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
    <div className="card hero" style={heroStyle(t?.color)}>
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
