# Max Productive Upper/Lower Split — App Program Spec

Version: 2026-06-26 (rev 2)
Goal: natural-lifter hypertrophy with strength progression, high weekly volume, rest/cardio calendar support, and historical workout logging.

> **For Claude Code:** This file has two parts. The prose sections explain *intent* — read them so feature decisions (deload triggers, RIR enforcement, volume math) match the training philosophy. The `PROGRAM_DATA` JSON block near the bottom is the canonical structured data to seed into the app. Treat the JSON as source of truth for exercises/sets/reps; treat the prose as the "why." Preserve any existing user history and adapt to the current codebase — do not rebuild from scratch.

---

## Changes from rev 1

- Upper A: **Reverse Pec Deck → Face Pull** (keeps rear-delt volume but adds external rotation + mid-trap work for shoulder health under heavy pressing load).
- Lower A: **Added Pallof Press** (anti-rotation / bracing — carries over to compounds).
- Lower A: **Leg Press trimmed 3 → 2 sets** (keeps weekly quad volume in the recoverable ~18 range).
- Lower B: **Hip Thrust → 45° Hyperextension, glute-focused** (cable kickback as alternate; also adds posterior-chain volume and is easier to progress in a busy gym).
- **Warm-up protocol added** as its own section. Warm-up sets are flagged `countsTowardVolume: false` and must never be included in weekly volume math.

---

## Important framing

This is a **maximum productive volume** template for an experienced (4+ year) natural lifter, not a beginner ramp. The app must support fatigue flags and deload logic so the program does not need to be redesigned later.

Do not run every set to failure. This template assumes:

- Compounds: mostly 1-2 RIR
- Isolations: mostly 0-1 RIR
- Heavy hinges/squats: avoid true failure
- Deload trigger: 2 consecutive performance drops, persistent joint pain, or recovery scores trending down

## Warm-up protocol (does NOT count toward volume)

Logged separately from working sets. The app should offer these but exclude them from all volume targets and progression math.

- **First compound of each session:** 2-3 ramp sets — roughly 50% then 75% of the first working weight, low reps, no fatigue.
- **Second heavy compound (e.g. RDL, second press):** 1-2 ramp sets.
- **Lower days, before squatting/hinging:** brief activation — glute bridges, band walks, or 90/90 hip work. Not load-bearing, not counted.
- Isolations generally need no dedicated warm-up once the joint is warm.

## Weekly layout

| Day | Type | Label | Purpose |
|---|---|---|---|
| Monday | Workout | Upper A | Chest/back strength bias + direct delts/arms |
| Tuesday | Workout | Lower A | Quad bias + RDL hamstring work + bracing |
| Wednesday | Cardio or Rest | Zone 2 / Recovery | 30-45 min Zone 2 or full rest |
| Thursday | Workout | Upper B | Back/press balance + direct delts/arms |
| Friday | Workout | Lower B | Posterior chain + balanced legs |
| Saturday | Cardio | Cardio Day | 35-60 min Zone 2 (scale down if performance is dropping) |
| Sunday | Rest | Full Rest | No lifting; walking/mobility only |

## Progression

**Double progression for compounds.** Example: 4 sets of 6-10. Stay at the same weight until all 4 sets hit 10 reps at the target RIR, then increase load next time.

**Rep-then-load for isolations.** Add reps first. Increase load only when all sets hit the top of the range with clean form.

## Deload logic

The app should flag a deload if:

- Same movement pattern drops for 2 consecutive exposures
- RIR is much lower than intended despite same weight/reps
- Joint pain or soreness is logged repeatedly
- Sleep/readiness is poor and performance is falling

Default deload: reduce working sets by 30-50% for one week, keep movement patterns, avoid failure.

## App requirements this program depends on

1. Rest/cardio days must be real schedule entries.
2. Past workouts must be accessible by calendar date.
3. Each session must store exercise-level and set-level history.
4. Calendar must distinguish planned, completed, missed, rest, and cardio days.
5. Warm-up sets are logged but excluded from volume targets and progression math.
6. Preserve existing data and adapt to the current codebase rather than rebuilding from scratch.

---

## PROGRAM_DATA

Canonical structured data. `restSeconds` is `[min, max]`. `countsTowardVolume` is `false` for warm-ups and anything intended as activation. `warmupSets` is the suggested number of separate (uncounted) ramp sets for that movement.

```json
{
  "program": {
    "name": "Max Productive Upper/Lower Split",
    "version": "2026-06-26-rev2",
    "experienceLevel": "advanced",
    "goal": "hypertrophy_with_strength",
    "philosophy": {
      "compoundRIR": "1-2",
      "isolationRIR": "0-1",
      "avoidTrueFailureOn": ["heavy squats", "heavy hinges"],
      "warmupsCountTowardVolume": false
    },
    "deload": {
      "triggers": [
        "same movement pattern drops for 2 consecutive exposures",
        "RIR much lower than intended at same weight/reps",
        "repeated joint pain or soreness logged",
        "poor sleep/readiness with falling performance"
      ],
      "defaultAction": {
        "reduceWorkingSetsPercent": [30, 50],
        "durationWeeks": 1,
        "keepMovementPatterns": true,
        "avoidFailure": true
      }
    },
    "weeklySchedule": [
      { "day": "Monday",    "type": "workout", "workout": "upperA",   "label": "Upper A" },
      { "day": "Tuesday",   "type": "workout", "workout": "lowerA",   "label": "Lower A" },
      { "day": "Wednesday", "type": "cardio_or_rest", "label": "Zone 2 / Recovery", "cardioMinutes": [30, 45] },
      { "day": "Thursday",  "type": "workout", "workout": "upperB",   "label": "Upper B" },
      { "day": "Friday",    "type": "workout", "workout": "lowerB",   "label": "Lower B" },
      { "day": "Saturday",  "type": "cardio",  "label": "Cardio Day", "cardioMinutes": [35, 60], "note": "scale down if performance is dropping" },
      { "day": "Sunday",    "type": "rest",    "label": "Full Rest",  "note": "walking/mobility only" }
    ],
    "warmupProtocol": {
      "firstCompoundRampSets": 2,
      "firstCompoundRampPercents": [50, 75],
      "secondHeavyCompoundRampSets": 1,
      "lowerDayActivation": ["glute bridges", "band walks", "90/90 hip work"],
      "countsTowardVolume": false
    },
    "workouts": {
      "upperA": {
        "label": "Upper A",
        "estimatedMinutes": [85, 100],
        "exercises": [
          { "order": 1, "name": "Incline Dumbbell Press", "type": "compound", "sets": 4, "repRange": "6-10", "rir": "1-2", "restSeconds": [120, 180], "primaryMuscles": ["chest"], "secondaryMuscles": ["front delts", "triceps"], "warmupSets": 3, "countsTowardVolume": true },
          { "order": 2, "name": "Chest-Supported Row", "type": "compound", "sets": 4, "repRange": "6-10", "rir": "1-2", "restSeconds": [120, 180], "primaryMuscles": ["back", "lats"], "secondaryMuscles": ["rear delts", "biceps"], "warmupSets": 1, "countsTowardVolume": true },
          { "order": 3, "name": "Neutral-Grip Lat Pulldown or Pull-Up", "type": "compound", "sets": 4, "repRange": "8-12", "rir": "1-2", "restSeconds": [120, 120], "primaryMuscles": ["lats"], "secondaryMuscles": ["biceps"], "warmupSets": 1, "countsTowardVolume": true },
          { "order": 4, "name": "Seated DB or Machine Shoulder Press", "type": "compound", "sets": 2, "repRange": "6-10", "rir": "1-2", "restSeconds": [120, 120], "primaryMuscles": ["front delts"], "secondaryMuscles": ["triceps", "side delts"], "warmupSets": 1, "countsTowardVolume": true },
          { "order": 5, "name": "Pec Deck or Cable Fly", "type": "isolation", "sets": 4, "repRange": "10-15", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["chest"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 6, "name": "Cable Lateral Raise", "type": "isolation", "sets": 4, "repRange": "12-20", "rir": "0-1", "restSeconds": [60, 75], "primaryMuscles": ["side delts"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 7, "name": "Face Pull", "type": "isolation", "sets": 3, "repRange": "12-20", "rir": "0-1", "restSeconds": [60, 75], "primaryMuscles": ["rear delts"], "secondaryMuscles": ["mid traps", "external rotators"], "warmupSets": 0, "countsTowardVolume": true, "note": "Replaces reverse pec deck — adds external rotation + trap work for shoulder health." },
          { "order": 8, "name": "Incline Dumbbell Curl", "type": "isolation", "sets": 4, "repRange": "8-12", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["biceps"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 9, "name": "Rope Pressdown", "type": "isolation", "sets": 4, "repRange": "10-15", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["triceps"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true }
        ]
      },
      "lowerA": {
        "label": "Lower A",
        "estimatedMinutes": [80, 90],
        "exercises": [
          { "order": 1, "name": "Hack Squat or High-Bar Squat", "type": "compound", "sets": 4, "repRange": "6-10", "rir": "1-2", "restSeconds": [180, 180], "primaryMuscles": ["quads"], "secondaryMuscles": ["glutes"], "warmupSets": 3, "countsTowardVolume": true },
          { "order": 2, "name": "Romanian Deadlift", "type": "compound", "sets": 4, "repRange": "6-10", "rir": "1-2", "restSeconds": [180, 180], "primaryMuscles": ["hamstrings"], "secondaryMuscles": ["glutes", "erectors"], "warmupSets": 2, "countsTowardVolume": true },
          { "order": 3, "name": "Leg Press", "type": "compound", "sets": 2, "repRange": "10-15", "rir": "1-2", "restSeconds": [120, 180], "primaryMuscles": ["quads"], "secondaryMuscles": ["glutes"], "warmupSets": 1, "countsTowardVolume": true, "note": "Trimmed 3→2 to keep weekly quad volume recoverable." },
          { "order": 4, "name": "Lying Leg Curl", "type": "isolation", "sets": 4, "repRange": "10-15", "rir": "0-1", "restSeconds": [90, 90], "primaryMuscles": ["hamstrings"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 5, "name": "Leg Extension", "type": "isolation", "sets": 3, "repRange": "12-20", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["quads"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 6, "name": "Standing Calf Raise", "type": "isolation", "sets": 5, "repRange": "8-12", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["calves"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 7, "name": "Cable Crunch", "type": "isolation", "sets": 3, "repRange": "10-15", "rir": "1-2", "restSeconds": [60, 75], "primaryMuscles": ["abs"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 8, "name": "Pallof Press", "type": "isolation", "sets": 3, "repRange": "8-12 each side", "rir": "1-2", "restSeconds": [45, 60], "primaryMuscles": ["core", "obliques"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true, "note": "Anti-rotation / bracing — carries over to compounds." }
        ]
      },
      "upperB": {
        "label": "Upper B",
        "estimatedMinutes": [85, 100],
        "exercises": [
          { "order": 1, "name": "Flat Bench Press or Machine Chest Press", "type": "compound", "sets": 4, "repRange": "6-10", "rir": "1-2", "restSeconds": [120, 180], "primaryMuscles": ["chest"], "secondaryMuscles": ["front delts", "triceps"], "warmupSets": 3, "countsTowardVolume": true },
          { "order": 2, "name": "Weighted Pull-Up or Neutral Pulldown", "type": "compound", "sets": 4, "repRange": "6-10", "rir": "1-2", "restSeconds": [120, 180], "primaryMuscles": ["lats"], "secondaryMuscles": ["biceps"], "warmupSets": 2, "countsTowardVolume": true },
          { "order": 3, "name": "Cable Row", "type": "compound", "sets": 4, "repRange": "8-12", "rir": "1-2", "restSeconds": [120, 120], "primaryMuscles": ["back"], "secondaryMuscles": ["rear delts", "biceps"], "warmupSets": 1, "countsTowardVolume": true },
          { "order": 4, "name": "Low-Incline Dumbbell Press", "type": "compound", "sets": 4, "repRange": "8-12", "rir": "1-2", "restSeconds": [120, 120], "primaryMuscles": ["chest"], "secondaryMuscles": ["front delts", "triceps"], "warmupSets": 1, "countsTowardVolume": true },
          { "order": 5, "name": "Cable Fly or Pec Deck", "type": "isolation", "sets": 2, "repRange": "12-20", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["chest"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 6, "name": "Machine or Cable Lateral Raise", "type": "isolation", "sets": 4, "repRange": "12-20", "rir": "0-1", "restSeconds": [60, 75], "primaryMuscles": ["side delts"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 7, "name": "Rear-Delt Cable Fly", "type": "isolation", "sets": 3, "repRange": "12-20", "rir": "0-1", "restSeconds": [60, 75], "primaryMuscles": ["rear delts"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 8, "name": "Cable Curl or EZ-Bar Curl", "type": "isolation", "sets": 4, "repRange": "8-12", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["biceps"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true, "note": "Cable preferred — better peak tension at shortened position, cleaner load jumps." },
          { "order": 9, "name": "Overhead Cable Triceps Extension", "type": "isolation", "sets": 4, "repRange": "10-15", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["triceps"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true }
        ]
      },
      "lowerB": {
        "label": "Lower B",
        "estimatedMinutes": [80, 90],
        "exercises": [
          { "order": 1, "name": "Squat, Hack Squat, or Leg Press", "type": "compound", "sets": 4, "repRange": "8-12", "rir": "1-2", "restSeconds": [180, 180], "primaryMuscles": ["quads"], "secondaryMuscles": ["glutes"], "warmupSets": 3, "countsTowardVolume": true },
          { "order": 2, "name": "45° Hyperextension (Glute-Focused) or Cable Kickback", "type": "isolation", "sets": 3, "repRange": "10-15", "rir": "1-2", "restSeconds": [90, 90], "primaryMuscles": ["glutes"], "secondaryMuscles": ["hamstrings", "erectors"], "warmupSets": 0, "countsTowardVolume": true, "note": "Replaces hip thrust — easier to progress in a busy gym, adds posterior-chain volume." },
          { "order": 3, "name": "Bulgarian Split Squat or Walking Lunge", "type": "compound", "sets": 3, "repRange": "8-12 each leg", "rir": "1-2", "restSeconds": [120, 180], "primaryMuscles": ["quads", "glutes"], "secondaryMuscles": ["hamstrings"], "warmupSets": 1, "countsTowardVolume": true },
          { "order": 4, "name": "Seated Leg Curl", "type": "isolation", "sets": 4, "repRange": "8-12", "rir": "0-1", "restSeconds": [90, 90], "primaryMuscles": ["hamstrings"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 5, "name": "Leg Extension", "type": "isolation", "sets": 3, "repRange": "12-20", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["quads"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 6, "name": "Seated Calf Raise", "type": "isolation", "sets": 5, "repRange": "10-15", "rir": "0-1", "restSeconds": [75, 90], "primaryMuscles": ["calves"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true },
          { "order": 7, "name": "Hanging Knee Raise or Captain's Chair Raise", "type": "isolation", "sets": 3, "repRange": "10-20", "rir": "1-2", "restSeconds": [60, 75], "primaryMuscles": ["abs"], "secondaryMuscles": [], "warmupSets": 0, "countsTowardVolume": true }
        ]
      }
    },
    "weeklyVolumeTargets": {
      "chest": 18,
      "back_lats_upper_back": 16,
      "side_delts": 8,
      "rear_delts": 6,
      "front_delts": 2,
      "biceps": 8,
      "triceps": 8,
      "quads": 18,
      "hamstrings": 12,
      "glutes": 14,
      "calves": 10,
      "abs_core": 9,
      "notes": {
        "rear_delts": "6 direct + rows + face pull external rotation",
        "front_delts": "2 direct + all pressing",
        "biceps": "8 direct + all pulling",
        "triceps": "8 direct + all pressing",
        "quads": "direct/effective; trimmed from ~20 for recovery",
        "glutes": "effective sets across hinges, hyperext, split squats",
        "abs_core": "includes anti-rotation (Pallof)"
      }
    }
  }
}
```

---

## Suggested data model (for reference, adapt to your schema)

- `Program` → has many `Workout` templates and a `WeeklySchedule`.
- `Workout` → ordered list of `ExerciseSlot` (the JSON above).
- `Session` → a dated instance of a `Workout`; status ∈ {planned, completed, missed}. Rest/cardio days are also dated `CalendarEntry` rows so the calendar can render every day.
- `SetLog` → belongs to a `Session` + `ExerciseSlot`; stores weight, reps, RIR, and `isWarmup` (excluded from volume + progression). This single flag keeps warm-ups out of your math cleanly.
- Deload + progression run as functions over recent `SetLog` history per movement pattern — the JSON gives you the targets to compare against.
