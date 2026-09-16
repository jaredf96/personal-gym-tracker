import type { Exercise } from "../types";
import { daysAgo } from "../lib/dates";

// Deterministic "notes -> next workouts" rules. A set or readiness note that
// mentions pain in a body area (e.g. "left shoulder pinch on incline") makes the
// next workouts that load that area add one warm-up set per affected lift and a
// short stretch/activation list. Weight suggestions are never changed here.
//
// An area stays active until 2 completed sessions after the latest note have
// trained it without a new note, or for 14 days, whichever comes first.
// A cue to adjust, not a diagnosis.

export const PAIN_WINDOW_DAYS = 14;
export const CLEAR_AFTER_CLEAN_SESSIONS = 2;

export type PainArea =
  | "shoulder"
  | "elbow"
  | "wrist"
  | "neck"
  | "upper-back"
  | "lower-back"
  | "hip"
  | "knee"
  | "ankle"
  | "chest"
  | "biceps"
  | "triceps"
  | "lats"
  | "hamstring"
  | "quad"
  | "calf"
  | "glute";

export type Side = "left" | "right" | "both";

export interface PainMention {
  area: PainArea;
  side?: Side;
}

// ---------------------------------------------------------------------------
// Parsing one note
// ---------------------------------------------------------------------------

// Pain words any area accepts.
const STRONG =
  /\b(?:pain|painful|hurt|hurts|hurting|tweak|tweaked|tweaky|twinge|twinged|strain|strained|pinch|pinched|pinching|pinchy|sharp|impinge\w*|tendin\w*|tendon\w*|injur\w*)\b/;
// Milder words: they count for joints only. On a muscle ("quads sore") they
// usually mean ordinary training soreness.
const MILD =
  /\b(?:ache|aches|aching|achy|sore|soreness|tight|tightness|stiff|stiffness|tender|irritated|cranky|bothering|bugging)\b/;

// Removed before looking for pain words.
const NOT_PAIN = [
  /\b(?:no|zero|without)\s+(?:\w+\s+){0,2}?(?:pain|discomfort|issues?|problems?|soreness|tightness)\b/g,
  /\bpain[- ]?free\b/g,
  /\b(?:doesn't|does not|didn't|did not|don't|do not|not|never)\s+(?:\w+\s+)?(?:hurt|hurts|hurting|ache|aching|sore|tight|bother\w*)\b/g,
  // Coaching cues, not symptoms: "keep back tight", "stay tight", "brace tight",
  // and "get tight" as an instruction (but "shoulder getting tight" is a symptom).
  /\b(?:keep|keeping|kept|stay|staying|stayed|brace|bracing|braced|squeeze|squeezing)\s+(?:\w+\s+){0,2}?tight\b/g,
  /^\s*get\s+(?:\w+\s+){0,2}?tight\b/g,
];

// Exercise names that contain an area word ("shoulder press hurt my elbow").
// Stripped first; used only if nothing else names an area.
const EXERCISE_NAMES =
  /\b(?:hip[- ](?:thrusts?|abductions?|adductions?)|calf[- ]raises?|chest[- ](?:press(?:es)?|supported|flys?|flies)|lat[- ]pull[- ]?downs?|lateral[- ]raises?|shoulder[- ]press(?:es)?|triceps?[- ](?:extensions?|press[- ]?downs?|push[- ]?downs?)|biceps?[- ]curls?|hamstring[- ]curls?|glute[- ](?:bridges?|kickbacks?)|back[- ](?:extensions?|squats?|off))\b/g;

const BACK_SYMPTOM =
  "(?:pain|painful|hurts?|hurting|tight|tightness|stiff|stiffness|sore|soreness|tweak\\w*|strain\\w*|spasm\\w*|ach\\w*)";

// Most specific first; each match is blanked out so "shoulder blade" is not
// also read as "shoulder".
const AREAS: { area: PainArea; joint: boolean; re: RegExp }[] = [
  { area: "upper-back", joint: true, re: /\b(?:upper[- ]back|mid[- ]back|thoracic|rhomboids?|shoulder[- ]blades?|scapulae?|scaps?)\b/g },
  {
    area: "lower-back",
    joint: true,
    re: new RegExp(
      `\\b(?:lower[- ]back|low[- ]back|lumbar|si[- ]joint|sciatica|(?:hurt|hurts|tweaked|strained|tweak|strain)\\s+(?:my\\s+)?back|back(?=\\s+(?:(?:is|was|feels?|felt|got|getting|kinda|a\\s+bit|a\\s+little|pretty|really|very|super)\\s+){0,2}${BACK_SYMPTOM}))\\b`,
      "g"
    ),
  },
  { area: "neck", joint: true, re: /\bneck\b/g },
  { area: "shoulder", joint: true, re: /\b(?:shoulders?|rotator[- ]cuffs?|ac[- ]joint|labrum)\b/g },
  { area: "elbow", joint: true, re: /\b(?:elbows?|forearms?)\b/g },
  { area: "wrist", joint: true, re: /\bwrists?\b/g },
  { area: "hip", joint: true, re: /\b(?:hips?|hip[- ]flexors?|groin|adductors?)\b/g },
  { area: "knee", joint: true, re: /\b(?:knees?|kneecaps?|patellar?|meniscus)\b/g },
  { area: "ankle", joint: true, re: /\b(?:ankles?|achilles)\b/g },
  { area: "chest", joint: false, re: /\b(?:pecs?|pectorals?|chest)\b/g },
  { area: "biceps", joint: false, re: /\bbiceps?\b/g },
  { area: "triceps", joint: false, re: /\btriceps?\b/g },
  { area: "lats", joint: false, re: /\blats?\b/g },
  { area: "hamstring", joint: false, re: /\b(?:hamstrings?|hammys?|hammies)\b/g },
  { area: "quad", joint: false, re: /\b(?:quads?|quadriceps)\b/g },
  { area: "calf", joint: false, re: /\b(?:calf|calves)\b/g },
  { area: "glute", joint: false, re: /\bglutes?\b/g },
];

function sideAround(clause: string, start: number, end: number): Side | undefined {
  const before = clause.slice(0, start);
  if (/\b(?:both|bilateral)\b/.test(before) || /\b(?:left\s+(?:and|&)\s+right|right\s+(?:and|&)\s+left)\b/.test(before)) {
    return "both";
  }
  // Nearest side word before the area, not reaching past an "and".
  const words = before.trim().split(/\s+/).filter(Boolean).slice(-5).reverse();
  for (const w of words) {
    if (w === "and" || w === "&" || w === "+") break;
    if (w === "left" || w === "l" || w === "lt") return "left";
    if (w === "right" || w === "r" || w === "rt") return "right";
  }
  // "shoulder (left)", "knee, right" — the comma case is its own clause, so only
  // the word right after the area is checked.
  const after = clause.slice(end).trim().split(/\s+/)[0]?.replace(/[()]/g, "");
  if (after === "left" || after === "l") return "left";
  if (after === "right" || after === "r") return "right";
  return undefined;
}

function findAreas(clause: string, strong: boolean): PainMention[] {
  const found: PainMention[] = [];
  let text = clause;
  for (const { area, joint, re } of AREAS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    const blanks: [number, number][] = [];
    while ((m = re.exec(text))) {
      blanks.push([m.index, m.index + m[0].length]);
      if (!joint && !strong) continue;
      const side = sideAround(text, m.index, m.index + m[0].length);
      const existing = found.find((f) => f.area === area);
      if (!existing) found.push(side ? { area, side } : { area });
      else if (side && existing.side !== side) existing.side = existing.side ? "both" : side;
    }
    // Blank with a non-space placeholder: spaces would glue the words around a
    // match together ("left [elbow] and right" must not read as "left and right").
    for (const [a, b] of blanks) text = text.slice(0, a) + "#".repeat(b - a) + text.slice(b);
  }
  return found;
}

/** Areas a note says hurt, with the side when written. [] when none. */
export function parsePainNote(note: string | undefined): PainMention[] {
  if (!note) return [];
  const clauses = note
    .toLowerCase()
    .replace(/[‘’]/g, "'") // iOS keyboards type curly apostrophes
    .split(/[.;!?\n,]+|\bbut\b|\bthough\b|\bhowever\b/)
    .map((c) => c.trim())
    .filter(Boolean);

  const out: PainMention[] = [];
  let previousAreas: PainMention[] = [];
  for (const raw of clauses) {
    let clause = raw;
    for (const re of NOT_PAIN) clause = clause.replace(re, " ");
    const strong = STRONG.test(clause);
    const mild = MILD.test(clause);

    const withoutNames = clause.replace(EXERCISE_NAMES, " ");
    let areas = findAreas(withoutNames, strong);
    if (areas.length === 0) areas = findAreas(clause, strong);

    if (strong || mild) {
      // "left shoulder, still sore" — a symptom with no area of its own refers
      // to the area named just before it (same joint/muscle rule applies).
      const hits = (areas.length ? areas : previousAreas).filter((a) => strong || isJoint(a.area));
      for (const h of hits) {
        const existing = out.find((o) => o.area === h.area);
        if (!existing) out.push({ ...h });
        else if (h.side && existing.side !== h.side) existing.side = existing.side ? "both" : h.side;
      }
    }
    // Remember every area named (even without a symptom) for the next clause.
    const named = findAreas(withoutNames, true);
    previousAreas = named.length ? named : findAreas(clause, true);
  }
  return out;
}

function isJoint(area: PainArea): boolean {
  return AREAS.find((a) => a.area === area)?.joint ?? false;
}

// ---------------------------------------------------------------------------
// Which lifts load an area
// ---------------------------------------------------------------------------

function hasMuscle(list: string[] | undefined, ...names: string[]): boolean {
  return (list ?? []).some((m) => names.includes(m.trim().toLowerCase()));
}

/**
 * Whether a lift loads the area enough to deserve the extra warm-up. Muscles
 * rather than movement pattern: the library tags Rope Pressdown and Pallof
 * Press as "Press", and neither loads the shoulder like a bench press.
 */
export function affectsArea(area: PainArea, ex: Exercise): boolean {
  const p = ex.primaryMuscles;
  const s = ex.secondaryMuscles;
  const pattern = ex.movementPattern;
  const name = ex.name.toLowerCase();
  const pressCompound = ex.type === "compound" && hasMuscle(p, "chest", "front delts");
  // Rows list lats as a primary muscle too, so overhead pulls go by name.
  const overheadPull = /pull[- ]?downs?|pull[- ]?ups?|chin[- ]?ups?/.test(name);
  switch (area) {
    case "shoulder":
      // Presses, flies, raises and overhead work. Rows, face pulls and rear-delt
      // work are usually shoulder-friendly and are left alone.
      return (
        pressCompound ||
        hasMuscle(p, "chest", "front delts", "side delts") ||
        overheadPull ||
        name.includes("overhead")
      );
    case "elbow":
      return hasMuscle(p, "biceps", "triceps") || overheadPull;
    case "wrist":
      return pressCompound || hasMuscle(p, "biceps");
    case "neck":
      return hasMuscle(p, "front delts", "side delts") || hasMuscle(s, "mid traps");
    case "upper-back":
      return hasMuscle(p, "back", "lats", "rear delts") || hasMuscle(s, "mid traps");
    case "lower-back":
      return (
        pattern === "Hinge" ||
        (pattern === "Squat/Knee" && ex.type === "compound") ||
        hasMuscle(s, "erectors")
      );
    case "hip":
      return pattern === "Hinge" || pattern === "Squat/Knee" || hasMuscle(p, "glutes");
    case "knee":
      // Leg curls load the knee; an RDL (hamstrings too) does not.
      return (
        pattern === "Squat/Knee" ||
        hasMuscle(p, "quads") ||
        (ex.type === "isolation" && hasMuscle(p, "hamstrings"))
      );
    case "ankle":
      return pattern === "Squat/Knee" || hasMuscle(p, "calves");
    case "chest":
      return hasMuscle(p, "chest");
    case "biceps":
      return hasMuscle(p, "biceps", "lats");
    case "triceps":
      return pressCompound || hasMuscle(p, "triceps");
    case "lats":
      return hasMuscle(p, "lats", "back");
    case "hamstring":
      return pattern === "Hinge" || hasMuscle(p, "hamstrings") || hasMuscle(s, "hamstrings");
    case "quad":
      return hasMuscle(p, "quads");
    case "calf":
      return hasMuscle(p, "calves");
    case "glute":
      return hasMuscle(p, "glutes") || hasMuscle(s, "glutes");
  }
}

// ---------------------------------------------------------------------------
// Active areas across recent notes
// ---------------------------------------------------------------------------

export interface PainNoteSource {
  text: string;
  date: string; // YYYY-MM-DD (local)
  endedAt?: string; // the session's end, for set notes; absent for readiness notes
}

export interface TrainedSession {
  date: string;
  endedAt: string;
  exerciseIds: string[]; // exercises with working sets
}

export interface ActivePainArea {
  area: PainArea;
  label: string; // "left shoulder"
  lastNoted: string; // date of the latest note
  quote: string; // that note, trimmed
  cleanSessionsSince: number; // sessions since that trained the area with no new note
}

const LABEL: Record<PainArea, string> = {
  shoulder: "shoulder",
  elbow: "elbow",
  wrist: "wrist",
  neck: "neck",
  "upper-back": "upper back",
  "lower-back": "lower back",
  hip: "hip",
  knee: "knee",
  ankle: "ankle",
  chest: "chest",
  biceps: "biceps",
  triceps: "triceps",
  lats: "lats",
  hamstring: "hamstring",
  quad: "quad",
  calf: "calf",
  glute: "glute",
};

const PLURAL: Partial<Record<PainArea, string>> = {
  shoulder: "shoulders",
  elbow: "elbows",
  wrist: "wrists",
  hip: "hips",
  knee: "knees",
  ankle: "ankles",
  hamstring: "hamstrings",
  quad: "quads",
  calf: "calves",
  glute: "glutes",
};

function areaLabel(area: PainArea, sides: Set<Side>): string {
  const left = sides.has("left") || sides.has("both");
  const right = sides.has("right") || sides.has("both");
  if (left && right) return PLURAL[area] ? `both ${PLURAL[area]}` : LABEL[area];
  if (left) return `left ${LABEL[area]}`;
  if (right) return `right ${LABEL[area]}`;
  return LABEL[area];
}

function quote(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 80 ? `${t.slice(0, 77).trimEnd()}…` : t;
}

/**
 * The areas that should still shape upcoming workouts. `sessions` are completed
 * sessions; `today` is the local date (injectable for tests).
 */
export function activePainAreas(
  notes: PainNoteSource[],
  sessions: TrainedSession[],
  exercisesById: Map<string, Exercise>,
  today: string
): ActivePainArea[] {
  const now = new Date(`${today}T12:00:00`);
  const byArea = new Map<PainArea, (PainNoteSource & { side?: Side })[]>();
  for (const note of notes) {
    if (note.date > today) continue;
    for (const m of parsePainNote(note.text)) {
      const list = byArea.get(m.area) ?? [];
      list.push({ ...note, side: m.side });
      byArea.set(m.area, list);
    }
  }

  const out: ActivePainArea[] = [];
  for (const [area, mentions] of byArea) {
    const recent = mentions.filter((m) => daysAgo(m.date, now) <= PAIN_WINDOW_DAYS);
    if (recent.length === 0) continue;
    recent.sort((a, b) => a.date.localeCompare(b.date) || (a.endedAt ?? "").localeCompare(b.endedAt ?? ""));
    const latest = recent[recent.length - 1];
    // Same-day sessions only count as "after" a set note from an earlier
    // session that day; a readiness note covers its whole day.
    const boundary = recent
      .filter((m) => m.date === latest.date && m.endedAt)
      .map((m) => m.endedAt as string)
      .sort()
      .pop();
    const sameDayOnly = recent.some((m) => m.date === latest.date && !m.endedAt);

    const clean = sessions.filter((s) => {
      const after =
        s.date > latest.date ||
        (s.date === latest.date && !sameDayOnly && boundary !== undefined && s.endedAt > boundary);
      if (!after) return false;
      return s.exerciseIds.some((id) => {
        const ex = exercisesById.get(id);
        return !!ex && affectsArea(area, ex);
      });
    }).length;
    if (clean >= CLEAR_AFTER_CLEAN_SESSIONS) continue;

    const sides = new Set(recent.map((m) => m.side).filter((s): s is Side => !!s));
    out.push({
      area,
      label: areaLabel(area, sides),
      lastNoted: latest.date,
      quote: quote(latest.text),
      cleanSessionsSince: clean,
    });
  }
  return out.sort((a, b) => b.lastNoted.localeCompare(a.lastNoted) || a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Adjustments for one workout
// ---------------------------------------------------------------------------

const PREP: Record<PainArea, string[]> = {
  shoulder: [
    "Band pull-aparts 2×15",
    "Band external rotations 2×15 each side",
    "Band pass-throughs 2×10",
    "Cross-body shoulder stretch 30s each side",
  ],
  elbow: ["Wrist flexor & extensor stretch 30s each", "Light band pressdowns 2×20", "Light band curls 2×20"],
  wrist: ["Wrist circles 10 each way", "Prayer & reverse-prayer stretch 30s each", "Light wrist curls 2×15"],
  neck: ["Chin tucks 2×10", "Upper-trap stretch 30s each side", "Band pull-aparts 2×15"],
  "upper-back": ["Foam-roller thoracic extensions ×10", "Open-book rotations 8 each side", "Band pull-aparts 2×15"],
  "lower-back": ["Cat-cow ×10", "Bird dogs 2×8 each side", "Dead bugs 2×8 each side", "Glute bridges 2×12"],
  hip: ["90/90 hip switches ×10", "Half-kneeling hip flexor stretch 30s each side", "Band walks 2×10 each way"],
  knee: ["5 min easy bike", "Leg swings 10 each leg", "Bodyweight box squats 2×10", "Terminal knee extensions 2×15"],
  ankle: ["Knee-to-wall ankle rocks 10 each side", "Calf stretch 30s each side", "Bodyweight calf raises 2×15"],
  chest: ["Doorway pec stretch 30s each side", "Band pull-aparts 2×15", "Easy push-ups 2×10"],
  biceps: ["Biceps wall stretch 30s each side", "Light band curls 2×20"],
  triceps: ["Overhead triceps stretch 30s each side", "Light band pressdowns 2×20"],
  lats: ["Lat stretch on a rack 30s each side", "Light straight-arm pulldowns 2×15"],
  hamstring: ["Leg swings 10 each leg", "Gentle hamstring stretch 30s each side", "Glute bridges 2×12"],
  quad: ["Couch stretch 30s each side", "Bodyweight squats 2×10"],
  calf: ["Calf stretch 30s each side", "Bodyweight calf raises 2×15"],
  glute: ["Figure-4 glute stretch 30s each side", "Glute bridges 2×12", "Band walks 2×10 each way"],
};

export interface PainAdjustment extends ActivePainArea {
  prep: string[];
  affected: { id: string; name: string }[]; // lifts that get +1 warm-up set
}

/** Adjustments for a workout's lifts. Areas that none of them load are left out. */
export function adjustmentsForExercises(
  areas: ActivePainArea[],
  exercises: Exercise[]
): PainAdjustment[] {
  const out: PainAdjustment[] = [];
  for (const a of areas) {
    const seen = new Set<string>();
    const affected: { id: string; name: string }[] = [];
    for (const ex of exercises) {
      if (seen.has(ex.id) || !affectsArea(a.area, ex)) continue;
      seen.add(ex.id);
      affected.push({ id: ex.id, name: ex.name });
    }
    if (affected.length) out.push({ ...a, prep: PREP[a.area], affected });
  }
  return out;
}
