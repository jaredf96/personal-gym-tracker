import { useState } from "react";
import type { SetEntry, Unit } from "../types";
import type { PlanItem } from "../engine/analysis";
import { addSetEntry, deleteSetEntry, updateSetEntry } from "../db/repo";
import { fmtNum, fmtWeight, repRange } from "../lib/format";
import { Pill } from "./ui";

interface Props {
  item: PlanItem;
  sets: SetEntry[]; // logged sets for this exercise in this session
  unit: Unit;
  sessionId: string;
  onSetLogged: (restSeconds: number) => void;
}

export default function ExerciseCard({ item, sets, unit, sessionId, onSetLogged }: Props) {
  const { templateExercise: te, exercise, previousStats, suggestion } = item;

  const initialWeight =
    sets.length > 0
      ? sets[sets.length - 1].weight
      : suggestion.suggestedWeight ?? previousStats?.baseWeight ?? "";

  const [weight, setWeight] = useState<string>(initialWeight === "" ? "" : String(initialWeight));
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState("");
  const [isWarmup, setIsWarmup] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  const workingCount = sets.filter((s) => !s.isWarmup).length;

  async function logSet() {
    const r = parseInt(reps, 10);
    if (!Number.isFinite(r) || r <= 0) return;
    const w = weight === "" ? 0 : parseFloat(weight);
    await addSetEntry({
      sessionId,
      exerciseId: exercise.id,
      setNumber: sets.length + 1,
      weight: Number.isFinite(w) ? w : 0,
      reps: r,
      rir: rir === "" ? undefined : parseInt(rir, 10),
      isWarmup,
      notes: note || undefined,
    });
    setReps("");
    setNote("");
    setShowNote(false);
    if (!isWarmup) onSetLogged(te.restMax);
  }

  const restLabel = te.restMin === te.restMax ? `${te.restMin}s` : `${te.restMin}–${te.restMax}s`;

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <h3>{exercise.name}</h3>
            {te.isMainLift && <Pill tone="accent">Main</Pill>}
          </div>
          <div className="muted small">
            {te.targetSets} × {repRange(te.repMin, te.repMax)}
            {te.perSide ? "/side" : ""} · RIR {te.rirTarget} · rest {restLabel} ·{" "}
            {exercise.primaryMuscles.join(" / ")}
          </div>
        </div>
        <Pill>{shortRule(te.progressionRule)}</Pill>
      </div>

      {te.warmupSets > 0 && (
        <div className="faint tiny mt">
          🔥 Warm-up: {te.warmupSets} ramp set{te.warmupSets === 1 ? "" : "s"} (~50%, 75%) — tap the
          W toggle; warm-ups don't count toward volume.
        </div>
      )}

      {/* Last session + deterministic suggestion */}
      <div
        className="mt small"
        style={{
          background: "var(--surface-2)",
          borderRadius: "var(--radius-sm)",
          padding: "9px 11px",
        }}
      >
        <div className="muted">
          {previousStats ? (
            <>
              Last: {fmtWeight(previousStats.baseWeight, unit)} · {previousStats.totalReps} reps
              {previousStats.bestSet
                ? ` · best ${fmtNum(previousStats.bestSet.weight)}×${previousStats.bestSet.reps}`
                : ""}
            </>
          ) : (
            <>No history yet — set a baseline.</>
          )}
        </div>
        <div style={{ marginTop: 4, color: "var(--accent)" }}>
          ▸ {suggestion.action}
          <span className="muted"> — {suggestion.detail}</span>
        </div>
      </div>

      {te.notes && <div className="faint tiny mt">📝 {te.notes}</div>}

      {/* Logged sets */}
      {sets.length > 0 && (
        <div className="mt">
          <div className="set-grid">
            <div className="head">#</div>
            <div className="head">Weight ({unit})</div>
            <div className="head">Reps</div>
            <div className="head">RIR</div>
            <div className="head"></div>
          </div>
          {sets.map((s, i) => (
            <LoggedSetRow key={s.id} set={s} index={i + 1} />
          ))}
        </div>
      )}

      {/* Add next set */}
      <div className="mt">
        <div className={`set-grid ${isWarmup ? "set-warmup" : ""}`}>
          <button
            className="btn-sm"
            title="Toggle warmup set"
            onClick={() => setIsWarmup((v) => !v)}
            style={{
              padding: 6,
              color: isWarmup ? "var(--amber)" : "var(--text-faint)",
              borderColor: isWarmup ? "var(--amber)" : "var(--border)",
            }}
          >
            {isWarmup ? "W" : workingCount + 1}
          </button>
          <input
            inputMode="decimal"
            placeholder={
              suggestion.suggestedWeight != null ? String(suggestion.suggestedWeight) : "wt"
            }
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <input
            inputMode="numeric"
            placeholder={String(te.repMin)}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
          <input
            inputMode="numeric"
            placeholder="–"
            value={rir}
            onChange={(e) => setRir(e.target.value)}
          />
          <button
            className="btn-primary"
            style={{ padding: 6 }}
            onClick={logSet}
            disabled={reps === ""}
            title="Log set"
          >
            ✓
          </button>
        </div>
        <div className="row between mt" style={{ marginTop: 8 }}>
          <button className="btn-ghost btn-sm" onClick={() => setShowNote((v) => !v)}>
            {showNote ? "Hide note" : "+ Note"}
          </button>
          <span className="faint tiny">
            {isWarmup ? "Warmup set (no rest timer)" : `Working set ${workingCount + 1}`}
          </span>
        </div>
        {showNote && (
          <input
            className="mt"
            placeholder="Set note (e.g. felt heavy, left side weaker)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

// Editable logged set. Uncontrolled inputs commit on blur; the parent's live
// query refreshes the list.
function LoggedSetRow({ set, index }: { set: SetEntry; index: number }) {
  return (
    <div className={`set-grid set-done ${set.isWarmup ? "set-warmup" : ""}`} style={{ marginTop: 6 }}>
      <button
        className="btn-sm"
        style={{ padding: 4, color: set.isWarmup ? "var(--amber)" : "var(--text-faint)" }}
        title="Toggle warmup"
        onClick={() => updateSetEntry({ ...set, isWarmup: !set.isWarmup })}
      >
        {set.isWarmup ? "W" : index}
      </button>
      <input
        inputMode="decimal"
        defaultValue={set.weight}
        onBlur={(e) => {
          const w = parseFloat(e.target.value);
          updateSetEntry({ ...set, weight: Number.isFinite(w) ? w : set.weight });
        }}
      />
      <input
        inputMode="numeric"
        defaultValue={set.reps}
        onBlur={(e) => {
          const r = parseInt(e.target.value, 10);
          updateSetEntry({ ...set, reps: Number.isFinite(r) ? r : set.reps });
        }}
      />
      <input
        inputMode="numeric"
        defaultValue={set.rir ?? ""}
        onBlur={(e) => {
          const v = e.target.value;
          updateSetEntry({ ...set, rir: v === "" ? undefined : parseInt(v, 10) });
        }}
      />
      <button
        className="btn-sm btn-ghost"
        style={{ padding: 4, color: "var(--text-faint)" }}
        title="Delete set"
        onClick={() => deleteSetEntry(set.id)}
      >
        ✕
      </button>
    </div>
  );
}

function shortRule(rule: string): string {
  if (rule.startsWith("Double")) return "Double prog.";
  if (rule.startsWith("Rep")) return "Rep prog.";
  if (rule.startsWith("Conservative")) return "Conservative";
  return rule;
}
