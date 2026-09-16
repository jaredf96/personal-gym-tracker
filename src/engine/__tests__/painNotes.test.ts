import { describe, it, expect } from "vitest";
import {
  activePainAreas,
  adjustmentsForExercises,
  affectsArea,
  parsePainNote,
  type PainNoteSource,
  type TrainedSession,
} from "../painNotes";
import type { Exercise } from "../../types";

function ex(
  id: string,
  name: string,
  movementPattern: string,
  type: Exercise["type"],
  primaryMuscles: string[],
  secondaryMuscles: string[] = []
): Exercise {
  return {
    id,
    name,
    type,
    primaryMuscles,
    secondaryMuscles,
    volumeMuscles: [],
    secondaryVolumeMuscles: [],
    movementPattern,
    defaultRepMin: 8,
    defaultRepMax: 12,
    perSide: false,
    defaultRestMin: 90,
    defaultRestMax: 120,
    rirTarget: "1-2",
    defaultWarmupSets: 0,
    progressionRule: type === "compound" ? "Double Progression" : "Rep Progression",
  };
}

// Mirrors the seeded library (names, patterns, muscles as generated).
const INCLINE = ex("incline-dumbbell-press", "Incline Dumbbell Press", "Press", "compound", ["chest"], ["front delts", "triceps"]);
const ROW = ex("chest-supported-row", "Chest-Supported Row", "Row/Pull", "compound", ["back", "lats"], ["rear delts", "biceps"]);
const PULLDOWN = ex("neutral-grip-lat-pulldown-or-pull-up", "Neutral-Grip Lat Pulldown or Pull-Up", "Row/Pull", "compound", ["lats"], ["biceps"]);
const OHP = ex("seated-db-or-machine-shoulder-press", "Seated DB or Machine Shoulder Press", "Press", "compound", ["front delts"], ["triceps", "side delts"]);
const PEC_DECK = ex("pec-deck-or-cable-fly", "Pec Deck", "Isolation/Core", "isolation", ["chest"]);
const LATERAL = ex("cable-lateral-raise", "Cable Lateral Raise", "Isolation/Core", "isolation", ["side delts"]);
const FACE_PULL = ex("face-pull", "Face Pull", "Isolation/Core", "isolation", ["rear delts"], ["mid traps", "external rotators"]);
const CURL = ex("incline-dumbbell-curl", "Incline Dumbbell Curl", "Isolation/Core", "isolation", ["biceps"]);
const PRESSDOWN = ex("rope-pressdown", "Rope Pressdown", "Press", "isolation", ["triceps"]);
const OVERHEAD_EXT = ex("overhead-cable-triceps-extension", "Overhead Cable Triceps Extension", "Isolation/Core", "isolation", ["triceps"]);
const SQUAT = ex("hack-squat-or-high-bar-squat", "Hack Squat or High-Bar Squat", "Squat/Knee", "compound", ["quads"], ["glutes"]);
const RDL = ex("romanian-deadlift", "Romanian Deadlift", "Hinge", "compound", ["hamstrings"], ["glutes", "erectors"]);
const LEG_CURL = ex("lying-leg-curl", "Lying Leg Curl", "Isolation/Core", "isolation", ["hamstrings"]);
const CALF = ex("standing-calf-raise", "Standing Calf Raise", "Isolation/Core", "isolation", ["calves"]);
const PALLOF = ex("pallof-press", "Pallof Press", "Press", "isolation", ["core", "obliques"]);

const UPPER_A = [INCLINE, ROW, PULLDOWN, OHP, PEC_DECK, LATERAL, FACE_PULL, CURL, PRESSDOWN];
const LOWER_A = [SQUAT, RDL, LEG_CURL, CALF, PALLOF];
const ALL = new Map([...UPPER_A, ...LOWER_A, OVERHEAD_EXT].map((e) => [e.id, e]));

describe("parsePainNote", () => {
  const cases: [string, ReturnType<typeof parsePainNote>][] = [
    ["left shoulder pinch on incline", [{ area: "shoulder", side: "left" }]],
    ["L shoulder pain", [{ area: "shoulder", side: "left" }]],
    ["right knee achy", [{ area: "knee", side: "right" }]],
    ["shoulder pain", [{ area: "shoulder" }]],
    ["low back tight after RDLs", [{ area: "lower-back" }]],
    ["tweaked my back on the last set", [{ area: "lower-back" }]],
    ["back is a bit stiff", [{ area: "lower-back" }]],
    ["pain came back in my knee", [{ area: "knee" }]],
    ["shoulder blade tight", [{ area: "upper-back" }]],
    ["left elbow and right wrist sore", [{ area: "elbow", side: "left" }, { area: "wrist", side: "right" }]],
    ["left and right shoulders ache", [{ area: "shoulder", side: "both" }]],
    ["shoulder felt fine, elbow hurts", [{ area: "elbow" }]],
    ["better today but left shoulder still sore", [{ area: "shoulder", side: "left" }]],
    ["left shoulder, still a bit sore", [{ area: "shoulder", side: "left" }]],
    ["tweaked my hamstring", [{ area: "hamstring" }]],
    ["chest pain on flat bench", [{ area: "chest" }]],
    ["shoulder press hurt my elbow", [{ area: "elbow" }]],
    ["shoulder press hurt", [{ area: "shoulder" }]],
    ["elbow tendinitis flaring up", [{ area: "elbow" }]],
    ["Knee didn’t hurt today, shoulder pinchy", [{ area: "shoulder" }]],
    // Must NOT count:
    ["keep back tight", []],
    ["brace, stay tight", []],
    ["felt heavy", []],
    ["no shoulder pain today", []],
    ["shoulder pain-free", []],
    ["knee doesn't hurt anymore", []],
    ["quads sore from Tuesday", []], // ordinary muscle soreness
    ["rear delts sore", []],
    ["sore", []],
    ["felt sharp, good pump", []],
    ["", []],
  ];
  for (const [note, expected] of cases) {
    it(JSON.stringify(note), () => {
      expect(parsePainNote(note)).toEqual(expected);
    });
  }
});

describe("affectsArea", () => {
  const names = (area: Parameters<typeof affectsArea>[0], list: Exercise[]) =>
    list.filter((e) => affectsArea(area, e)).map((e) => e.id);

  it("shoulder: presses, flies, raises and overhead pulls — not rows, face pulls, arms", () => {
    expect(names("shoulder", [...UPPER_A, OVERHEAD_EXT])).toEqual([
      "incline-dumbbell-press",
      "neutral-grip-lat-pulldown-or-pull-up",
      "seated-db-or-machine-shoulder-press",
      "pec-deck-or-cable-fly",
      "cable-lateral-raise",
      "overhead-cable-triceps-extension",
    ]);
  });

  it("knee: squats and knee isolations, not hinges or calves", () => {
    expect(names("knee", LOWER_A)).toEqual(["hack-squat-or-high-bar-squat", "lying-leg-curl"]);
  });

  it("lower back: hinges and loaded squats", () => {
    expect(names("lower-back", LOWER_A)).toEqual(["hack-squat-or-high-bar-squat", "romanian-deadlift"]);
  });

  it("a pain area with nothing to load on this workout produces no adjustment", () => {
    const knee = [{ area: "knee" as const, label: "knee", lastNoted: "2026-09-14", quote: "knee", cleanSessionsSince: 0 }];
    expect(adjustmentsForExercises(knee, UPPER_A)).toEqual([]);
  });
});

describe("activePainAreas", () => {
  const TODAY = "2026-09-17"; // Thursday
  const note = (text: string, date: string, endedAt?: string): PainNoteSource => ({ text, date, endedAt });
  const session = (date: string, list: Exercise[], hour = 19): TrainedSession => ({
    date,
    endedAt: `${date}T${hour}:00:00.000Z`,
    exerciseIds: list.map((e) => e.id),
  });

  it("a shoulder note from Monday's Upper A shapes the next upper day", () => {
    const monday = session("2026-09-14", UPPER_A);
    const active = activePainAreas(
      [note("left shoulder pinch on incline", "2026-09-14", monday.endedAt)],
      [monday, session("2026-09-15", LOWER_A)],
      ALL,
      TODAY
    );
    expect(active).toEqual([
      {
        area: "shoulder",
        label: "left shoulder",
        lastNoted: "2026-09-14",
        quote: "left shoulder pinch on incline",
        cleanSessionsSince: 0, // Lower A doesn't load the shoulder
      },
    ]);
    const adj = adjustmentsForExercises(active, UPPER_A);
    expect(adj[0].affected.map((a) => a.id)).toContain("pec-deck-or-cable-fly");
    expect(adj[0].prep.length).toBeGreaterThan(0);
  });

  it("clears after 2 sessions that train the area with no new note", () => {
    const n = note("shoulder pain", "2026-09-01", "2026-09-01T19:00:00.000Z");
    const one = [session("2026-09-01", UPPER_A), session("2026-09-03", UPPER_A)];
    expect(activePainAreas([n], one, ALL, "2026-09-04")[0].cleanSessionsSince).toBe(1);
    const two = [...one, session("2026-09-07", UPPER_A)];
    expect(activePainAreas([n], two, ALL, "2026-09-08")).toEqual([]);
  });

  it("a new note restarts the count", () => {
    const sessions = [session("2026-09-01", UPPER_A), session("2026-09-03", UPPER_A), session("2026-09-07", UPPER_A)];
    const notes = [
      note("shoulder pain", "2026-09-01", sessions[0].endedAt),
      note("shoulder still pinchy", "2026-09-07", sessions[2].endedAt),
    ];
    const active = activePainAreas(notes, sessions, ALL, "2026-09-08");
    expect(active).toHaveLength(1);
    expect(active[0].cleanSessionsSince).toBe(0);
    expect(active[0].lastNoted).toBe("2026-09-07");
  });

  it("expires after 14 days even without training the area", () => {
    const n = note("right knee achy", "2026-09-01");
    expect(activePainAreas([n], [], ALL, "2026-09-15")).toHaveLength(1);
    expect(activePainAreas([n], [], ALL, "2026-09-16")).toEqual([]);
  });

  it("a readiness note covers its whole day: that day's session is not pain-free", () => {
    const readiness = note("lower back tight", "2026-09-15");
    const sameDay = session("2026-09-15", LOWER_A);
    const nextDay = session("2026-09-16", LOWER_A);
    const active = activePainAreas([readiness], [sameDay, nextDay], ALL, TODAY);
    expect(active[0].cleanSessionsSince).toBe(1);
  });

  it("left and right notes in the window read as both", () => {
    const active = activePainAreas(
      [note("left shoulder sore", "2026-09-10"), note("right shoulder sore", "2026-09-12")],
      [],
      ALL,
      TODAY
    );
    expect(active[0].label).toBe("both shoulders");
  });
});
