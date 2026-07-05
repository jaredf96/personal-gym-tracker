import { describe, it, expect } from "vitest";
import { computeSetStats, est1rm, hasPainNote } from "../stats";
import { compareExercise } from "../comparison";
import { suggestProgression } from "../progression";
import { weeklyVolumeByMuscle } from "../volume";
import { nextTemplate, upcomingTemplates } from "../rotation";
import { projectLifts, buildCalendarMonth } from "../schedule";
import { detectFatigue } from "../flags";
import type {
  Exercise,
  SetEntry,
  Settings,
  TemplateExercise,
  VolumeTarget,
  WeeklyScheduleDay,
  WorkoutSession,
  WorkoutTemplate,
} from "../../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const settings: Settings = {
  id: "app",
  unit: "lb",
  weightIncrementUpper: 5,
  weightIncrementLower: 10,
  restTimerAutoStart: true,
  coachProvider: "mock",
};

function makeExercise(over: Partial<Exercise> = {}): Exercise {
  return {
    id: "bench",
    name: "Bench Press",
    type: "compound",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps"],
    volumeMuscles: ["chest"],
    secondaryVolumeMuscles: [],
    movementPattern: "Press",
    defaultRepMin: 6,
    defaultRepMax: 10,
    perSide: false,
    defaultRestMin: 120,
    defaultRestMax: 180,
    rirTarget: "1-2",
    defaultWarmupSets: 2,
    progressionRule: "Double Progression",
    ...over,
  };
}

function makeSlot(over: Partial<TemplateExercise> = {}): TemplateExercise {
  return {
    id: "upper-a:1",
    templateId: "upper-a",
    exerciseId: "bench",
    order: 1,
    targetSets: 4,
    repMin: 6,
    repMax: 10,
    perSide: false,
    restMin: 120,
    restMax: 180,
    rirTarget: "1-2",
    warmupSets: 2,
    countsTowardVolume: true,
    progressionRule: "Double Progression",
    exerciseType: "compound",
    isMainLift: true,
    ...over,
  };
}

let setSeq = 0;
function makeSet(weight: number, reps: number, over: Partial<SetEntry> = {}): SetEntry {
  setSeq += 1;
  return {
    id: `s${setSeq}`,
    sessionId: over.sessionId ?? "sess1",
    exerciseId: "bench",
    setNumber: setSeq,
    weight,
    reps,
    isWarmup: false,
    createdAt: `2026-06-29T18:${String(setSeq % 60).padStart(2, "0")}:00.000Z`,
    ...over,
  };
}

const TEMPLATES: WorkoutTemplate[] = [
  { id: "upper-a", name: "Upper A", type: "Upper", sequenceOrder: 1, color: "#4f8cff", estMinMinutes: 85, estMaxMinutes: 100 },
  { id: "lower-a", name: "Lower A", type: "Lower", sequenceOrder: 2, color: "#3ecf8e", estMinMinutes: 80, estMaxMinutes: 90 },
  { id: "upper-b", name: "Upper B", type: "Upper", sequenceOrder: 3, color: "#b079f5", estMinMinutes: 85, estMaxMinutes: 100 },
  { id: "lower-b", name: "Lower B", type: "Lower", sequenceOrder: 4, color: "#f2a44b", estMinMinutes: 80, estMaxMinutes: 90 },
];

// Monday-first weekly rhythm matching the seeded program.
const SCHEDULE: WeeklyScheduleDay[] = [
  { id: "monday", dayIndex: 0, day: "Monday", type: "workout", templateId: "upper-a", label: "Upper A" },
  { id: "tuesday", dayIndex: 1, day: "Tuesday", type: "workout", templateId: "lower-a", label: "Lower A" },
  { id: "wednesday", dayIndex: 2, day: "Wednesday", type: "cardio_or_rest", label: "Zone 2 / Recovery" },
  { id: "thursday", dayIndex: 3, day: "Thursday", type: "workout", templateId: "upper-b", label: "Upper B" },
  { id: "friday", dayIndex: 4, day: "Friday", type: "workout", templateId: "lower-b", label: "Lower B" },
  { id: "saturday", dayIndex: 5, day: "Saturday", type: "cardio", label: "Cardio Day" },
  { id: "sunday", dayIndex: 6, day: "Sunday", type: "rest", label: "Full Rest" },
];

function makeSession(id: string, date: string, templateId = "upper-a", ended = true): WorkoutSession {
  return {
    id,
    templateId,
    date,
    startedAt: `${date}T18:00:00.000Z`,
    endedAt: ended ? `${date}T19:00:00.000Z` : undefined,
  };
}

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------

describe("computeSetStats", () => {
  it("excludes warm-up sets from every metric", () => {
    const stats = computeSetStats([
      makeSet(45, 10, { isWarmup: true }),
      makeSet(100, 10),
      makeSet(100, 9),
    ]);
    expect(stats.setCount).toBe(2);
    expect(stats.totalReps).toBe(19);
    expect(stats.totalVolume).toBe(1900);
    expect(stats.topWeight).toBe(100);
  });

  it("ranks best set by estimated 1RM, not raw weight", () => {
    const stats = computeSetStats([makeSet(100, 12), makeSet(110, 2)]);
    // 100x12 est1rm = 140 > 110x2 est1rm ≈ 117.3
    expect(stats.bestSet?.weight).toBe(100);
    expect(est1rm(100, 12)).toBeCloseTo(140);
  });
});

describe("hasPainNote", () => {
  it("ignores bare body parts in benign cues", () => {
    expect(hasPainNote(["keep back tight", "brace shoulder blades"])).toBe(false);
  });
  it("matches real pain language with word boundaries", () => {
    expect(hasPainNote(["lower back ache today"])).toBe(true);
    expect(hasPainNote(["slight knee twinge on rep 8"])).toBe(true);
    expect(hasPainNote(["felt strong"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// progression
// ---------------------------------------------------------------------------

describe("suggestProgression — double progression", () => {
  it("suggests a load increase only when all target sets top out at ONE load", () => {
    const topped = [makeSet(100, 10), makeSet(100, 10), makeSet(100, 10), makeSet(100, 10)];
    const s = suggestProgression(makeSlot(), makeExercise(), topped, settings);
    expect(s.kind).toBe("increase-weight");
    expect(s.suggestedWeight).toBe(105);
  });

  it("never lets a back-off set trigger or drag the anchor down", () => {
    const backoff = [makeSet(100, 10), makeSet(100, 10), makeSet(100, 10), makeSet(80, 10)];
    const s = suggestProgression(makeSlot(), makeExercise(), backoff, settings);
    expect(s.kind).toBe("add-reps"); // mixed loads: not ready
    expect(s.suggestedWeight).toBe(100); // anchored on TOP weight, not 80
  });

  it("stays at the weight while reps are short of the top", () => {
    const short = [makeSet(100, 10), makeSet(100, 9), makeSet(100, 8), makeSet(100, 8)];
    const s = suggestProgression(makeSlot(), makeExercise(), short, settings);
    expect(s.kind).toBe("add-reps");
    expect(s.suggestedWeight).toBe(100);
  });
});

describe("suggestProgression — conservative (heavy hinge)", () => {
  const rdlSlot = makeSlot({ progressionRule: "Conservative Progression" });
  const rdl = makeExercise({
    id: "rdl",
    name: "Romanian Deadlift",
    movementPattern: "Hinge",
    progressionRule: "Conservative Progression",
  });

  it("offers only a small optional increase when topped out with reps in reserve", () => {
    const sets = [1, 2, 3, 4].map(() => makeSet(225, 10, { exerciseId: "rdl", rir: 2 }));
    const s = suggestProgression(rdlSlot, rdl, sets, settings);
    expect(s.kind).toBe("small-increase");
    expect(s.suggestedWeight).toBe(235); // compound hinge gets the lower-body jump
  });

  it("says repeat when a pain note is present, even if topped out", () => {
    const sets = [1, 2, 3, 4].map((i) =>
      makeSet(225, 10, { exerciseId: "rdl", rir: 2, notes: i === 1 ? "slight low back ache" : undefined })
    );
    const s = suggestProgression(rdlSlot, rdl, sets, settings);
    expect(s.kind).toBe("repeat");
  });
});

describe("increment selection", () => {
  it("gives lower-body ISOLATIONS the small jump (hyperextension, leg curl)", () => {
    const hyperSlot = makeSlot({ progressionRule: "Rep Progression", exerciseType: "isolation", targetSets: 3, repMin: 10, repMax: 15 });
    const hyper = makeExercise({
      id: "hyper",
      type: "isolation",
      movementPattern: "Hinge",
      progressionRule: "Rep Progression",
    });
    const sets = [1, 2, 3].map(() => makeSet(90, 15, { exerciseId: "hyper" }));
    const s = suggestProgression(hyperSlot, hyper, sets, settings);
    expect(s.kind).toBe("small-increase");
    expect(s.suggestedWeight).toBe(95); // 5, not the 10 lb compound jump
  });
});

// ---------------------------------------------------------------------------
// comparison
// ---------------------------------------------------------------------------

describe("compareExercise", () => {
  it("falls back to reps for bodyweight (0-load) exercises", () => {
    const prev = [makeSet(0, 10), makeSet(0, 10)];
    const cur = [makeSet(0, 12), makeSet(0, 11)];
    const c = compareExercise("hanging-knee-raise", cur, prev);
    expect(c.trend).toBe("improved");
  });

  it("flags regression on volume drop", () => {
    const prev = [makeSet(100, 10), makeSet(100, 10)];
    const cur = [makeSet(100, 8), makeSet(100, 8)];
    expect(compareExercise("bench", cur, prev).trend).toBe("regressed");
  });
});

// ---------------------------------------------------------------------------
// volume
// ---------------------------------------------------------------------------

describe("weeklyVolumeByMuscle", () => {
  const targets: VolumeTarget[] = [
    { muscle: "quads", label: "Quads", targetSets: 18, minSets: 16, maxSets: 20 },
    { muscle: "glutes", label: "Glutes", targetSets: 14, minSets: 12, maxSets: 16 },
  ];
  const bss = makeExercise({
    id: "bss",
    type: "compound",
    volumeMuscles: ["quads", "glutes"],
    secondaryVolumeMuscles: [],
  });
  const rdl = makeExercise({
    id: "rdl2",
    volumeMuscles: ["hamstrings"],
    secondaryVolumeMuscles: ["glutes"],
  });
  const byId = new Map([
    [bss.id, bss],
    [rdl.id, rdl],
  ]);
  // Reference: Wed 2026-07-01 → week Mon 2026-06-29 .. Sun 2026-07-05.
  const ref = new Date("2026-07-01T12:00:00");
  const sessions = [makeSession("in-week", "2026-06-30"), makeSession("out-week", "2026-06-20")];

  it("counts multi-primary fully, secondary at half, warm-ups not at all, out-of-week never", () => {
    const sets = [
      makeSet(100, 10, { sessionId: "in-week", exerciseId: "bss" }), // quads +1, glutes +1
      makeSet(100, 10, { sessionId: "in-week", exerciseId: "bss", isWarmup: true }), // nothing
      makeSet(225, 8, { sessionId: "in-week", exerciseId: "rdl2" }), // glutes +0.5
      makeSet(100, 10, { sessionId: "out-week", exerciseId: "bss" }), // outside the week
    ];
    const rows = weeklyVolumeByMuscle(sets, sessions, byId, targets, ref);
    const quads = rows.find((r) => r.muscle === "quads")!;
    const glutes = rows.find((r) => r.muscle === "glutes")!;
    expect(quads.hardSets).toBe(1);
    expect(glutes.hardSets).toBe(1.5);
    expect(quads.status).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// rotation + schedule
// ---------------------------------------------------------------------------

describe("rotation", () => {
  it("advances from the last completed template and wraps", () => {
    expect(nextTemplate(TEMPLATES, makeSession("x", "2026-06-29", "lower-b"))?.id).toBe("upper-a");
    expect(nextTemplate(TEMPLATES, makeSession("x", "2026-06-29", "upper-a"))?.id).toBe("lower-a");
    expect(nextTemplate(TEMPLATES, null)?.id).toBe("upper-a");
  });

  it("upcomingTemplates previews the wrap-around order", () => {
    const up = upcomingTemplates(TEMPLATES, makeSession("x", "2026-06-29", "upper-b"), 4);
    expect(up.map((t) => t.id)).toEqual(["lower-b", "upper-a", "lower-a", "upper-b"]);
  });
});

describe("projectLifts", () => {
  it("assigns lifts only to workout days and skips days already trained", () => {
    // Monday 2026-06-29, completed Upper A that day; project Mon..Sun.
    const sessions = [makeSession("done", "2026-06-29", "upper-a")];
    const from = new Date("2026-06-29T12:00:00");
    const map = projectLifts(from, 7, SCHEDULE, TEMPLATES, sessions);
    expect(map.has("2026-06-29")).toBe(false); // already trained
    expect(map.get("2026-06-30")?.id).toBe("lower-a"); // next in sequence
    expect(map.has("2026-07-01")).toBe(false); // Wednesday cardio
    expect(map.get("2026-07-02")?.id).toBe("upper-b");
    expect(map.get("2026-07-03")?.id).toBe("lower-b");
    expect(map.has("2026-07-04")).toBe(false); // Saturday cardio
    expect(map.has("2026-07-05")).toBe(false); // Sunday rest
  });
});

describe("buildCalendarMonth", () => {
  const today = "2026-06-25"; // Thursday
  it("never marks days before the first logged activity as missed", () => {
    const sessions = [makeSession("first", "2026-06-22", "upper-a")]; // Monday
    const days = buildCalendarMonth(2026, 5, SCHEDULE, TEMPLATES, sessions, [], today);
    const before = days.find((d) => d.date === "2026-06-15")!; // workout Monday, pre-activity
    const after = days.find((d) => d.date === "2026-06-23")!; // workout Tuesday, post-activity, unlogged
    expect(before.status).toBe("rest");
    expect(after.status).toBe("missed");
  });

  it("marks skipped MANDATORY cardio as missed but optional cardio as rest", () => {
    const sessions = [makeSession("first", "2026-06-08", "upper-a")];
    const days = buildCalendarMonth(2026, 5, SCHEDULE, TEMPLATES, sessions, [], today);
    const saturday = days.find((d) => d.date === "2026-06-13")!; // type "cardio"
    const wednesday = days.find((d) => d.date === "2026-06-10")!; // "cardio_or_rest"
    expect(saturday.status).toBe("missed");
    expect(wednesday.status).toBe("rest");
  });

  it("marks completed days with the template and collects all session ids", () => {
    const sessions = [
      makeSession("a", "2026-06-22", "upper-a"),
      { ...makeSession("b", "2026-06-22", "lower-a"), endedAt: "2026-06-22T21:00:00.000Z" },
    ];
    const days = buildCalendarMonth(2026, 5, SCHEDULE, TEMPLATES, sessions, [], today);
    const mon = days.find((d) => d.date === "2026-06-22")!;
    expect(mon.status).toBe("completed");
    expect(mon.sessionIds).toEqual(["a", "b"]);
    expect(mon.template?.id).toBe("lower-a"); // latest ended wins the tile
  });
});

// ---------------------------------------------------------------------------
// fatigue
// ---------------------------------------------------------------------------

describe("detectFatigue", () => {
  const mk = (vol: number) => [makeSet(vol / 10, 10)]; // one set of volume `vol`
  it("requires two CONSECUTIVE drops across three sessions", () => {
    expect(detectFatigue("bench", "Bench", [mk(1000), mk(900), mk(800)])).not.toBeNull();
    expect(detectFatigue("bench", "Bench", [mk(900), mk(1000), mk(800)])).toBeNull(); // one drop
    expect(detectFatigue("bench", "Bench", [mk(1000), mk(900)])).toBeNull(); // too little history
  });
});
