import { useState, type CSSProperties } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db/db";
import {
  deleteSession,
  finishSession,
  getActiveSession,
  getNextTemplate,
  getSetsForSession,
  getSettings,
  startSession,
} from "../db/repo";
import { getUpcomingPlan } from "../engine/analysis";
import type { SetEntry } from "../types";
import { fmtNum, plural } from "../lib/format";
import ExerciseCard from "../components/ExerciseCard";
import RestTimer from "../components/RestTimer";
import { ScreenHeader, Empty } from "../components/ui";
import { useToast } from "../components/Toast";
import ScreenSkeleton from "../components/Skeleton";

export default function LoggerScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [rest, setRest] = useState<{ endAt: number; totalMs: number } | null>(null);

  const data = useLiveQuery(async () => {
    let session = sessionId ? await db.workoutSessions.get(sessionId) : undefined;
    if (!session) session = (await getActiveSession()) ?? undefined;
    // No active workout: don't dead-end — surface the next lift so the Log tab
    // is always one tap from training.
    if (!session) return { session: null, next: (await getNextTemplate()).template };

    const template = await db.workoutTemplates.get(session.templateId);
    const [plan, sets, settings] = await Promise.all([
      template ? getUpcomingPlan(template, session.id) : Promise.resolve(null),
      getSetsForSession(session.id),
      getSettings(),
    ]);
    return { session, template, plan, sets, settings };
  }, [sessionId]);

  if (!data) return <ScreenSkeleton />;

  if (!data.session || !data.plan) {
    const next = "next" in data ? data.next : null;
    return (
      <div className="screen">
        <ScreenHeader title="Workout" subtitle="No session in progress" />
        {next ? (
          <div className="card hero" style={{ "--hero": next.color } as CSSProperties}>
            <div className="muted small">Next in your rotation</div>
            <h2 style={{ color: next.color }}>{next.name}</h2>
            <button
              className="btn-primary btn-block btn-lg mt"
              style={{ background: next.color, borderColor: next.color }}
              onClick={async () => {
                const s = await startSession(next.id);
                navigate(`/workout/${s.id}`);
              }}
            >
              Start {next.name} →
            </button>
          </div>
        ) : (
          <Empty>No program loaded yet.</Empty>
        )}
        <button className="btn-ghost btn-block mt" onClick={() => navigate("/")}>
          Go to Today →
        </button>
      </div>
    );
  }

  const { session, plan, sets, settings } = data;

  // Group logged sets by exercise.
  const byExercise = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const list = byExercise.get(s.exerciseId) ?? [];
    list.push(s);
    byExercise.set(s.exerciseId, list);
  }

  const working = sets.filter((s) => !s.isWarmup);
  const totalVolume = working.reduce((a, s) => a + s.weight * s.reps, 0);

  function onSetLogged(restSeconds: number) {
    if (settings.restTimerAutoStart && restSeconds > 0) {
      setRest({ endAt: Date.now() + restSeconds * 1000, totalMs: restSeconds * 1000 });
    }
    toast.show("Set logged");
  }

  async function finish() {
    if (working.length === 0) {
      const ok = window.confirm("No working sets logged. Finish anyway?");
      if (!ok) return;
    }
    await finishSession(session.id);
    navigate(`/summary/${session.id}`);
  }

  async function discard() {
    const ok = window.confirm("Discard this workout and all its sets? This cannot be undone.");
    if (!ok) return;
    await deleteSession(session.id);
    toast.show("Workout discarded");
    navigate("/");
  }

  return (
    <div className="screen">
      <ScreenHeader
        title={plan.template.name}
        subtitle={`${plural(working.length, "set")} · ${fmtNum(totalVolume)} ${settings.unit} volume`}
        right={
          <button className="btn-primary btn-sm" onClick={finish}>
            Finish
          </button>
        }
      />

      {plan.items.map((item) => (
        <ExerciseCard
          key={item.templateExercise.id}
          item={item}
          sets={byExercise.get(item.exercise.id) ?? []}
          unit={settings.unit}
          sessionId={session.id}
          onSetLogged={onSetLogged}
        />
      ))}

      <div className="row mt-lg" style={{ gap: 10 }}>
        <button className="btn-primary btn-lg grow" onClick={finish}>
          Finish workout
        </button>
        <button className="btn-danger" onClick={discard}>
          Discard
        </button>
      </div>

      {rest && (
        <RestTimer
          endAt={rest.endAt}
          totalMs={rest.totalMs}
          onExtend={(s) =>
            setRest((r) => {
              if (!r) return r;
              // Extend from NOW when the countdown already expired — "+30s"
              // after 0:00 used to be a no-op.
              const base = Math.max(r.endAt, Date.now());
              return { endAt: base + s * 1000, totalMs: r.totalMs + s * 1000 };
            })
          }
          onSkip={() => setRest(null)}
        />
      )}
    </div>
  );
}
