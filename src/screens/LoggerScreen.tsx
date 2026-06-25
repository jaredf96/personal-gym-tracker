import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db/db";
import {
  deleteSession,
  finishSession,
  getActiveSession,
  getSetsForSession,
  getSettings,
} from "../db/repo";
import { getUpcomingPlan } from "../engine/analysis";
import type { SetEntry } from "../types";
import { fmtNum, plural } from "../lib/format";
import ExerciseCard from "../components/ExerciseCard";
import RestTimer from "../components/RestTimer";
import { ScreenHeader, Empty } from "../components/ui";
import { useToast } from "../components/Toast";

export default function LoggerScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [rest, setRest] = useState<{ endAt: number } | null>(null);

  const data = useLiveQuery(async () => {
    let session = sessionId ? await db.workoutSessions.get(sessionId) : undefined;
    if (!session) session = (await getActiveSession()) ?? undefined;
    if (!session) return { session: null };

    const template = await db.workoutTemplates.get(session.templateId);
    const [plan, sets, settings] = await Promise.all([
      template ? getUpcomingPlan(template, session.id) : Promise.resolve(null),
      getSetsForSession(session.id),
      getSettings(),
    ]);
    return { session, template, plan, sets, settings };
  }, [sessionId]);

  if (!data) return <div className="screen">Loading…</div>;

  if (!data.session || !data.plan) {
    return (
      <div className="screen">
        <ScreenHeader title="Workout" />
        <Empty>
          No active workout.
          <div className="mt">
            <button className="btn-primary" onClick={() => navigate("/")}>
              Go to Today →
            </button>
          </div>
        </Empty>
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
      setRest({ endAt: Date.now() + restSeconds * 1000 });
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
          onExtend={(s) => setRest((r) => (r ? { endAt: r.endAt + s * 1000 } : r))}
          onSkip={() => setRest(null)}
        />
      )}
    </div>
  );
}
