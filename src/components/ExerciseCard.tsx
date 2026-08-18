import { useState } from "react";
import type { SetEntry, Unit } from "../types";
import type { PlanItem } from "../engine/analysis";
import { addSetEntry, deleteSetEntry, updateSetEntry } from "../db/repo";
import { fmtNum, fmtWeight, repRange } from "../lib/format";
import { Pill } from "./ui";
import { muscleLabel } from "../db/normalize";

interface Props {
  item: PlanItem;
  sets: SetEntry[]; // logged sets for this exercise in this session
  unit: Unit;
  sessionId: string;
  /** The session's date (YYYY-MM-DD) — past dates get backdated timestamps. */
  sessionDate: string;
  onSetLogged: (restSeconds: number) => void;
  onRequestSwap?: () => void;
}

export default function ExerciseCard({ item, sets, unit, sessionId, sessionDate, onSetLogged, onRequestSwap }: Props) {
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
  const [showPlates, setShowPlates] = useState(false);

  const workingCount = sets.filter((s) => !s.isWarmup).length;

  async function logSet() {
    const r = parseInt(reps, 10);
    if (!Number.isFinite(r) || r <= 0) return;
    const w = weight === "" ? 0 : parseFloat(weight);
    const rirN = parseInt(rir, 10);
    // Backdated session: stamp sets inside that day so ordering and
    // "previous session" comparisons stay truthful.
    const backdated =
      sessionDate !== new Date().toISOString().slice(0, 10)
        ? new Date(`${sessionDate}T12:00:00.000Z`).getTime() + sets.length * 120_000
        : null;
    await addSetEntry({
      createdAt: backdated ? new Date(backdated).toISOString() : undefined,
      sessionId,
      exerciseId: exercise.id,
      setNumber: sets.length + 1,
      weight: Number.isFinite(w) ? w : 0,
      reps: r,
      rir: Number.isFinite(rirN) ? rirN : undefined, // garbage input never stores NaN
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
            {muscleLabel(exercise)}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Pill>{shortRule(te.progressionRule)}</Pill>
          {onRequestSwap && (
            <button className="btn-sm btn-ghost" style={{ padding: "4px 8px" }} title="Swap exercise" onClick={onRequestSwap}>
              ⇄
            </button>
          )}
        </div>
      </div>

      {item.swappedFrom && (
        <div className="mt">
          <Pill tone="accent">⇄ swapped in — was {item.swappedFrom.name}</Pill>
        </div>
      )}

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
          <div className="row" style={{ gap: 4 }}>
            <button className="btn-ghost btn-sm" onClick={() => setShowNote((v) => !v)}>
              {showNote ? "Hide note" : "+ Note"}
            </button>
            <button className="btn-ghost btn-sm" onClick={() => setShowPlates((v) => !v)}>
              {showPlates ? "Hide plates" : "Plates"}
            </button>
          </div>
          <span className="faint tiny">
            {isWarmup ? "Warmup set (no rest timer)" : `Working set ${workingCount + 1}`}
          </span>
        </div>
        {showPlates && (
          <div className="faint tiny mt num">{plateBreakdown(parseFloat(weight), unit)}</div>
        )}
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
          const n = parseInt(e.target.value, 10);
          updateSetEntry({ ...set, rir: Number.isFinite(n) ? n : undefined });
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

// Barbell plate math: what to load per side for the weight in the input.
function plateBreakdown(total: number, unit: Unit): string {
  const bar = unit === "lb" ? 45 : 20;
  const plates = unit === "lb" ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
  if (!Number.isFinite(total) || total <= 0) return `Enter a weight (bar = ${bar} ${unit})`;
  if (total < bar) return `Below bar weight (${bar} ${unit} bar) — dumbbell/machine load`;
  let perSide = (total - bar) / 2;
  const out: string[] = [];
  for (const p of plates) {
    const n = Math.floor(perSide / p + 1e-9);
    if (n > 0) {
      out.push(n > 1 ? `${p}×${n}` : `${p}`);
      perSide = Math.round((perSide - n * p) * 100) / 100;
    }
  }
  const rem = perSide > 0.01 ? ` (+${perSide} unmatched)` : "";
  return out.length ? `🏋️ Per side: ${out.join(" + ")}${rem} · bar ${bar}` : `🏋️ Empty bar (${bar} ${unit})`;
}

function shortRule(rule: string): string {
  if (rule.startsWith("Double")) return "Double prog.";
  if (rule.startsWith("Rep")) return "Rep prog.";
  if (rule.startsWith("Conservative")) return "Conservative";
  return rule;
}
