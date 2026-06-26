// AUTO-GENERATED from program/max_volume_upper_lower_program.md by scripts/gen_program.py
// Do not edit by hand — re-run the generator if the program changes.
import type {
  Exercise,
  WorkoutTemplate,
  TemplateExercise,
  VolumeTarget,
  WeeklyScheduleDay,
  ProgramMeta,
  ProgressionRuleInfo,
} from "../types";

// Bump when the seeded program changes; triggers a local wipe + reseed.
export const SEED_VERSION = "v2-maxvol-2026-06-26";

export const seedExercises: Exercise[] = [
  {
    "id": "incline-dumbbell-press",
    "name": "Incline Dumbbell Press",
    "type": "compound",
    "primaryMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "front delts",
      "triceps"
    ],
    "volumeMuscles": [
      "chest"
    ],
    "movementPattern": "Press",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "perSide": false,
    "defaultRestMin": 120,
    "defaultRestMax": 180,
    "rirTarget": "1-2",
    "defaultWarmupSets": 3,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "chest-supported-row",
    "name": "Chest-Supported Row",
    "type": "compound",
    "primaryMuscles": [
      "back",
      "lats"
    ],
    "secondaryMuscles": [
      "rear delts",
      "biceps"
    ],
    "volumeMuscles": [
      "back_lats_upper_back"
    ],
    "movementPattern": "Row/Pull",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "perSide": false,
    "defaultRestMin": 120,
    "defaultRestMax": 180,
    "rirTarget": "1-2",
    "defaultWarmupSets": 1,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "neutral-grip-lat-pulldown-or-pull-up",
    "name": "Neutral-Grip Lat Pulldown or Pull-Up",
    "type": "compound",
    "primaryMuscles": [
      "lats"
    ],
    "secondaryMuscles": [
      "biceps"
    ],
    "volumeMuscles": [
      "back_lats_upper_back"
    ],
    "movementPattern": "Row/Pull",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": false,
    "defaultRestMin": 120,
    "defaultRestMax": 120,
    "rirTarget": "1-2",
    "defaultWarmupSets": 1,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "seated-db-or-machine-shoulder-press",
    "name": "Seated DB or Machine Shoulder Press",
    "type": "compound",
    "primaryMuscles": [
      "front delts"
    ],
    "secondaryMuscles": [
      "triceps",
      "side delts"
    ],
    "volumeMuscles": [
      "front_delts"
    ],
    "movementPattern": "Press",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "perSide": false,
    "defaultRestMin": 120,
    "defaultRestMax": 120,
    "rirTarget": "1-2",
    "defaultWarmupSets": 1,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "pec-deck-or-cable-fly",
    "name": "Pec Deck or Cable Fly",
    "type": "isolation",
    "primaryMuscles": [
      "chest"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "chest"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "perSide": false,
    "defaultRestMin": 75,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "cable-lateral-raise",
    "name": "Cable Lateral Raise",
    "type": "isolation",
    "primaryMuscles": [
      "side delts"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "side_delts"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 12,
    "defaultRepMax": 20,
    "perSide": false,
    "defaultRestMin": 60,
    "defaultRestMax": 75,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "face-pull",
    "name": "Face Pull",
    "type": "isolation",
    "primaryMuscles": [
      "rear delts"
    ],
    "secondaryMuscles": [
      "mid traps",
      "external rotators"
    ],
    "volumeMuscles": [
      "rear_delts"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 12,
    "defaultRepMax": 20,
    "perSide": false,
    "defaultRestMin": 60,
    "defaultRestMax": 75,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": "Replaces reverse pec deck — adds external rotation + trap work for shoulder health."
  },
  {
    "id": "incline-dumbbell-curl",
    "name": "Incline Dumbbell Curl",
    "type": "isolation",
    "primaryMuscles": [
      "biceps"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "biceps"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": false,
    "defaultRestMin": 75,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "rope-pressdown",
    "name": "Rope Pressdown",
    "type": "isolation",
    "primaryMuscles": [
      "triceps"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "triceps"
    ],
    "movementPattern": "Press",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "perSide": false,
    "defaultRestMin": 75,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "hack-squat-or-high-bar-squat",
    "name": "Hack Squat or High-Bar Squat",
    "type": "compound",
    "primaryMuscles": [
      "quads"
    ],
    "secondaryMuscles": [
      "glutes"
    ],
    "volumeMuscles": [
      "quads"
    ],
    "movementPattern": "Squat/Knee",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "perSide": false,
    "defaultRestMin": 180,
    "defaultRestMax": 180,
    "rirTarget": "1-2",
    "defaultWarmupSets": 3,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "romanian-deadlift",
    "name": "Romanian Deadlift",
    "type": "compound",
    "primaryMuscles": [
      "hamstrings"
    ],
    "secondaryMuscles": [
      "glutes",
      "erectors"
    ],
    "volumeMuscles": [
      "hamstrings"
    ],
    "movementPattern": "Hinge",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "perSide": false,
    "defaultRestMin": 180,
    "defaultRestMax": 180,
    "rirTarget": "1-2",
    "defaultWarmupSets": 2,
    "progressionRule": "Conservative Progression",
    "note": undefined
  },
  {
    "id": "leg-press",
    "name": "Leg Press",
    "type": "compound",
    "primaryMuscles": [
      "quads"
    ],
    "secondaryMuscles": [
      "glutes"
    ],
    "volumeMuscles": [
      "quads"
    ],
    "movementPattern": "Squat/Knee",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "perSide": false,
    "defaultRestMin": 120,
    "defaultRestMax": 180,
    "rirTarget": "1-2",
    "defaultWarmupSets": 1,
    "progressionRule": "Double Progression",
    "note": "Trimmed 3→2 to keep weekly quad volume recoverable."
  },
  {
    "id": "lying-leg-curl",
    "name": "Lying Leg Curl",
    "type": "isolation",
    "primaryMuscles": [
      "hamstrings"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "hamstrings"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "perSide": false,
    "defaultRestMin": 90,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "leg-extension",
    "name": "Leg Extension",
    "type": "isolation",
    "primaryMuscles": [
      "quads"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "quads"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 12,
    "defaultRepMax": 20,
    "perSide": false,
    "defaultRestMin": 75,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "standing-calf-raise",
    "name": "Standing Calf Raise",
    "type": "isolation",
    "primaryMuscles": [
      "calves"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "calves"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": false,
    "defaultRestMin": 75,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "cable-crunch",
    "name": "Cable Crunch",
    "type": "isolation",
    "primaryMuscles": [
      "abs"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "abs_core"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "perSide": false,
    "defaultRestMin": 60,
    "defaultRestMax": 75,
    "rirTarget": "1-2",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "pallof-press",
    "name": "Pallof Press",
    "type": "isolation",
    "primaryMuscles": [
      "core",
      "obliques"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "abs_core"
    ],
    "movementPattern": "Press",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": true,
    "defaultRestMin": 45,
    "defaultRestMax": 60,
    "rirTarget": "1-2",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": "Anti-rotation / bracing — carries over to compounds."
  },
  {
    "id": "flat-bench-press-or-machine-chest-press",
    "name": "Flat Bench Press or Machine Chest Press",
    "type": "compound",
    "primaryMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "front delts",
      "triceps"
    ],
    "volumeMuscles": [
      "chest"
    ],
    "movementPattern": "Press",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "perSide": false,
    "defaultRestMin": 120,
    "defaultRestMax": 180,
    "rirTarget": "1-2",
    "defaultWarmupSets": 3,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "weighted-pull-up-or-neutral-pulldown",
    "name": "Weighted Pull-Up or Neutral Pulldown",
    "type": "compound",
    "primaryMuscles": [
      "lats"
    ],
    "secondaryMuscles": [
      "biceps"
    ],
    "volumeMuscles": [
      "back_lats_upper_back"
    ],
    "movementPattern": "Row/Pull",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "perSide": false,
    "defaultRestMin": 120,
    "defaultRestMax": 180,
    "rirTarget": "1-2",
    "defaultWarmupSets": 2,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "cable-row",
    "name": "Cable Row",
    "type": "compound",
    "primaryMuscles": [
      "back"
    ],
    "secondaryMuscles": [
      "rear delts",
      "biceps"
    ],
    "volumeMuscles": [
      "back_lats_upper_back"
    ],
    "movementPattern": "Row/Pull",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": false,
    "defaultRestMin": 120,
    "defaultRestMax": 120,
    "rirTarget": "1-2",
    "defaultWarmupSets": 1,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "low-incline-dumbbell-press",
    "name": "Low-Incline Dumbbell Press",
    "type": "compound",
    "primaryMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "front delts",
      "triceps"
    ],
    "volumeMuscles": [
      "chest"
    ],
    "movementPattern": "Press",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": false,
    "defaultRestMin": 120,
    "defaultRestMax": 120,
    "rirTarget": "1-2",
    "defaultWarmupSets": 1,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "cable-fly-or-pec-deck",
    "name": "Cable Fly or Pec Deck",
    "type": "isolation",
    "primaryMuscles": [
      "chest"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "chest"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 12,
    "defaultRepMax": 20,
    "perSide": false,
    "defaultRestMin": 75,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "machine-or-cable-lateral-raise",
    "name": "Machine or Cable Lateral Raise",
    "type": "isolation",
    "primaryMuscles": [
      "side delts"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "side_delts"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 12,
    "defaultRepMax": 20,
    "perSide": false,
    "defaultRestMin": 60,
    "defaultRestMax": 75,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "rear-delt-cable-fly",
    "name": "Rear-Delt Cable Fly",
    "type": "isolation",
    "primaryMuscles": [
      "rear delts"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "rear_delts"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 12,
    "defaultRepMax": 20,
    "perSide": false,
    "defaultRestMin": 60,
    "defaultRestMax": 75,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "cable-curl-or-ez-bar-curl",
    "name": "Cable Curl or EZ-Bar Curl",
    "type": "isolation",
    "primaryMuscles": [
      "biceps"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "biceps"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": false,
    "defaultRestMin": 75,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": "Cable preferred — better peak tension at shortened position, cleaner load jumps."
  },
  {
    "id": "overhead-cable-triceps-extension",
    "name": "Overhead Cable Triceps Extension",
    "type": "isolation",
    "primaryMuscles": [
      "triceps"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "triceps"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "perSide": false,
    "defaultRestMin": 75,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "squat-hack-squat-or-leg-press",
    "name": "Squat, Hack Squat, or Leg Press",
    "type": "compound",
    "primaryMuscles": [
      "quads"
    ],
    "secondaryMuscles": [
      "glutes"
    ],
    "volumeMuscles": [
      "quads"
    ],
    "movementPattern": "Squat/Knee",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": false,
    "defaultRestMin": 180,
    "defaultRestMax": 180,
    "rirTarget": "1-2",
    "defaultWarmupSets": 3,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "45-hyperextension-glute-focused-or-cable-kickback",
    "name": "45° Hyperextension (Glute-Focused) or Cable Kickback",
    "type": "isolation",
    "primaryMuscles": [
      "glutes"
    ],
    "secondaryMuscles": [
      "hamstrings",
      "erectors"
    ],
    "volumeMuscles": [
      "glutes"
    ],
    "movementPattern": "Hinge",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "perSide": false,
    "defaultRestMin": 90,
    "defaultRestMax": 90,
    "rirTarget": "1-2",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": "Replaces hip thrust — easier to progress in a busy gym, adds posterior-chain volume."
  },
  {
    "id": "bulgarian-split-squat-or-walking-lunge",
    "name": "Bulgarian Split Squat or Walking Lunge",
    "type": "compound",
    "primaryMuscles": [
      "quads",
      "glutes"
    ],
    "secondaryMuscles": [
      "hamstrings"
    ],
    "volumeMuscles": [
      "quads",
      "glutes"
    ],
    "movementPattern": "Squat/Knee",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": true,
    "defaultRestMin": 120,
    "defaultRestMax": 180,
    "rirTarget": "1-2",
    "defaultWarmupSets": 1,
    "progressionRule": "Double Progression",
    "note": undefined
  },
  {
    "id": "seated-leg-curl",
    "name": "Seated Leg Curl",
    "type": "isolation",
    "primaryMuscles": [
      "hamstrings"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "hamstrings"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "perSide": false,
    "defaultRestMin": 90,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "seated-calf-raise",
    "name": "Seated Calf Raise",
    "type": "isolation",
    "primaryMuscles": [
      "calves"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "calves"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "perSide": false,
    "defaultRestMin": 75,
    "defaultRestMax": 90,
    "rirTarget": "0-1",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  },
  {
    "id": "hanging-knee-raise-or-captain-s-chair-raise",
    "name": "Hanging Knee Raise or Captain's Chair Raise",
    "type": "isolation",
    "primaryMuscles": [
      "abs"
    ],
    "secondaryMuscles": [],
    "volumeMuscles": [
      "abs_core"
    ],
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 20,
    "perSide": false,
    "defaultRestMin": 60,
    "defaultRestMax": 75,
    "rirTarget": "1-2",
    "defaultWarmupSets": 0,
    "progressionRule": "Rep Progression",
    "note": undefined
  }
];

export const seedTemplates: WorkoutTemplate[] = [
  {
    "id": "upper-a",
    "name": "Upper A",
    "type": "Upper",
    "sequenceOrder": 1,
    "color": "#4f8cff",
    "estMinMinutes": 85,
    "estMaxMinutes": 100
  },
  {
    "id": "lower-a",
    "name": "Lower A",
    "type": "Lower",
    "sequenceOrder": 2,
    "color": "#3ecf8e",
    "estMinMinutes": 80,
    "estMaxMinutes": 90
  },
  {
    "id": "upper-b",
    "name": "Upper B",
    "type": "Upper",
    "sequenceOrder": 3,
    "color": "#b079f5",
    "estMinMinutes": 85,
    "estMaxMinutes": 100
  },
  {
    "id": "lower-b",
    "name": "Lower B",
    "type": "Lower",
    "sequenceOrder": 4,
    "color": "#f2a44b",
    "estMinMinutes": 80,
    "estMaxMinutes": 90
  }
];

export const seedTemplateExercises: TemplateExercise[] = [
  {
    "id": "upper-a:1",
    "templateId": "upper-a",
    "exerciseId": "incline-dumbbell-press",
    "order": 1,
    "targetSets": 4,
    "repMin": 6,
    "repMax": 10,
    "perSide": false,
    "restMin": 120,
    "restMax": 180,
    "rirTarget": "1-2",
    "warmupSets": 3,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": true,
    "notes": undefined
  },
  {
    "id": "upper-a:2",
    "templateId": "upper-a",
    "exerciseId": "chest-supported-row",
    "order": 2,
    "targetSets": 4,
    "repMin": 6,
    "repMax": 10,
    "perSide": false,
    "restMin": 120,
    "restMax": 180,
    "rirTarget": "1-2",
    "warmupSets": 1,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-a:3",
    "templateId": "upper-a",
    "exerciseId": "neutral-grip-lat-pulldown-or-pull-up",
    "order": 3,
    "targetSets": 4,
    "repMin": 8,
    "repMax": 12,
    "perSide": false,
    "restMin": 120,
    "restMax": 120,
    "rirTarget": "1-2",
    "warmupSets": 1,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-a:4",
    "templateId": "upper-a",
    "exerciseId": "seated-db-or-machine-shoulder-press",
    "order": 4,
    "targetSets": 2,
    "repMin": 6,
    "repMax": 10,
    "perSide": false,
    "restMin": 120,
    "restMax": 120,
    "rirTarget": "1-2",
    "warmupSets": 1,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-a:5",
    "templateId": "upper-a",
    "exerciseId": "pec-deck-or-cable-fly",
    "order": 5,
    "targetSets": 4,
    "repMin": 10,
    "repMax": 15,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-a:6",
    "templateId": "upper-a",
    "exerciseId": "cable-lateral-raise",
    "order": 6,
    "targetSets": 4,
    "repMin": 12,
    "repMax": 20,
    "perSide": false,
    "restMin": 60,
    "restMax": 75,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-a:7",
    "templateId": "upper-a",
    "exerciseId": "face-pull",
    "order": 7,
    "targetSets": 3,
    "repMin": 12,
    "repMax": 20,
    "perSide": false,
    "restMin": 60,
    "restMax": 75,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": "Replaces reverse pec deck — adds external rotation + trap work for shoulder health."
  },
  {
    "id": "upper-a:8",
    "templateId": "upper-a",
    "exerciseId": "incline-dumbbell-curl",
    "order": 8,
    "targetSets": 4,
    "repMin": 8,
    "repMax": 12,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-a:9",
    "templateId": "upper-a",
    "exerciseId": "rope-pressdown",
    "order": 9,
    "targetSets": 4,
    "repMin": 10,
    "repMax": 15,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-a:1",
    "templateId": "lower-a",
    "exerciseId": "hack-squat-or-high-bar-squat",
    "order": 1,
    "targetSets": 4,
    "repMin": 6,
    "repMax": 10,
    "perSide": false,
    "restMin": 180,
    "restMax": 180,
    "rirTarget": "1-2",
    "warmupSets": 3,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": true,
    "notes": undefined
  },
  {
    "id": "lower-a:2",
    "templateId": "lower-a",
    "exerciseId": "romanian-deadlift",
    "order": 2,
    "targetSets": 4,
    "repMin": 6,
    "repMax": 10,
    "perSide": false,
    "restMin": 180,
    "restMax": 180,
    "rirTarget": "1-2",
    "warmupSets": 2,
    "countsTowardVolume": true,
    "progressionRule": "Conservative Progression",
    "exerciseType": "compound",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-a:3",
    "templateId": "lower-a",
    "exerciseId": "leg-press",
    "order": 3,
    "targetSets": 2,
    "repMin": 10,
    "repMax": 15,
    "perSide": false,
    "restMin": 120,
    "restMax": 180,
    "rirTarget": "1-2",
    "warmupSets": 1,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": false,
    "notes": "Trimmed 3→2 to keep weekly quad volume recoverable."
  },
  {
    "id": "lower-a:4",
    "templateId": "lower-a",
    "exerciseId": "lying-leg-curl",
    "order": 4,
    "targetSets": 4,
    "repMin": 10,
    "repMax": 15,
    "perSide": false,
    "restMin": 90,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-a:5",
    "templateId": "lower-a",
    "exerciseId": "leg-extension",
    "order": 5,
    "targetSets": 3,
    "repMin": 12,
    "repMax": 20,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-a:6",
    "templateId": "lower-a",
    "exerciseId": "standing-calf-raise",
    "order": 6,
    "targetSets": 5,
    "repMin": 8,
    "repMax": 12,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-a:7",
    "templateId": "lower-a",
    "exerciseId": "cable-crunch",
    "order": 7,
    "targetSets": 3,
    "repMin": 10,
    "repMax": 15,
    "perSide": false,
    "restMin": 60,
    "restMax": 75,
    "rirTarget": "1-2",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-a:8",
    "templateId": "lower-a",
    "exerciseId": "pallof-press",
    "order": 8,
    "targetSets": 3,
    "repMin": 8,
    "repMax": 12,
    "perSide": true,
    "restMin": 45,
    "restMax": 60,
    "rirTarget": "1-2",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": "Anti-rotation / bracing — carries over to compounds."
  },
  {
    "id": "upper-b:1",
    "templateId": "upper-b",
    "exerciseId": "flat-bench-press-or-machine-chest-press",
    "order": 1,
    "targetSets": 4,
    "repMin": 6,
    "repMax": 10,
    "perSide": false,
    "restMin": 120,
    "restMax": 180,
    "rirTarget": "1-2",
    "warmupSets": 3,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": true,
    "notes": undefined
  },
  {
    "id": "upper-b:2",
    "templateId": "upper-b",
    "exerciseId": "weighted-pull-up-or-neutral-pulldown",
    "order": 2,
    "targetSets": 4,
    "repMin": 6,
    "repMax": 10,
    "perSide": false,
    "restMin": 120,
    "restMax": 180,
    "rirTarget": "1-2",
    "warmupSets": 2,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-b:3",
    "templateId": "upper-b",
    "exerciseId": "cable-row",
    "order": 3,
    "targetSets": 4,
    "repMin": 8,
    "repMax": 12,
    "perSide": false,
    "restMin": 120,
    "restMax": 120,
    "rirTarget": "1-2",
    "warmupSets": 1,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-b:4",
    "templateId": "upper-b",
    "exerciseId": "low-incline-dumbbell-press",
    "order": 4,
    "targetSets": 4,
    "repMin": 8,
    "repMax": 12,
    "perSide": false,
    "restMin": 120,
    "restMax": 120,
    "rirTarget": "1-2",
    "warmupSets": 1,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-b:5",
    "templateId": "upper-b",
    "exerciseId": "cable-fly-or-pec-deck",
    "order": 5,
    "targetSets": 2,
    "repMin": 12,
    "repMax": 20,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-b:6",
    "templateId": "upper-b",
    "exerciseId": "machine-or-cable-lateral-raise",
    "order": 6,
    "targetSets": 4,
    "repMin": 12,
    "repMax": 20,
    "perSide": false,
    "restMin": 60,
    "restMax": 75,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-b:7",
    "templateId": "upper-b",
    "exerciseId": "rear-delt-cable-fly",
    "order": 7,
    "targetSets": 3,
    "repMin": 12,
    "repMax": 20,
    "perSide": false,
    "restMin": 60,
    "restMax": 75,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "upper-b:8",
    "templateId": "upper-b",
    "exerciseId": "cable-curl-or-ez-bar-curl",
    "order": 8,
    "targetSets": 4,
    "repMin": 8,
    "repMax": 12,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": "Cable preferred — better peak tension at shortened position, cleaner load jumps."
  },
  {
    "id": "upper-b:9",
    "templateId": "upper-b",
    "exerciseId": "overhead-cable-triceps-extension",
    "order": 9,
    "targetSets": 4,
    "repMin": 10,
    "repMax": 15,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-b:1",
    "templateId": "lower-b",
    "exerciseId": "squat-hack-squat-or-leg-press",
    "order": 1,
    "targetSets": 4,
    "repMin": 8,
    "repMax": 12,
    "perSide": false,
    "restMin": 180,
    "restMax": 180,
    "rirTarget": "1-2",
    "warmupSets": 3,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": true,
    "notes": undefined
  },
  {
    "id": "lower-b:2",
    "templateId": "lower-b",
    "exerciseId": "45-hyperextension-glute-focused-or-cable-kickback",
    "order": 2,
    "targetSets": 3,
    "repMin": 10,
    "repMax": 15,
    "perSide": false,
    "restMin": 90,
    "restMax": 90,
    "rirTarget": "1-2",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": "Replaces hip thrust — easier to progress in a busy gym, adds posterior-chain volume."
  },
  {
    "id": "lower-b:3",
    "templateId": "lower-b",
    "exerciseId": "bulgarian-split-squat-or-walking-lunge",
    "order": 3,
    "targetSets": 3,
    "repMin": 8,
    "repMax": 12,
    "perSide": true,
    "restMin": 120,
    "restMax": 180,
    "rirTarget": "1-2",
    "warmupSets": 1,
    "countsTowardVolume": true,
    "progressionRule": "Double Progression",
    "exerciseType": "compound",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-b:4",
    "templateId": "lower-b",
    "exerciseId": "seated-leg-curl",
    "order": 4,
    "targetSets": 4,
    "repMin": 8,
    "repMax": 12,
    "perSide": false,
    "restMin": 90,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-b:5",
    "templateId": "lower-b",
    "exerciseId": "leg-extension",
    "order": 5,
    "targetSets": 3,
    "repMin": 12,
    "repMax": 20,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-b:6",
    "templateId": "lower-b",
    "exerciseId": "seated-calf-raise",
    "order": 6,
    "targetSets": 5,
    "repMin": 10,
    "repMax": 15,
    "perSide": false,
    "restMin": 75,
    "restMax": 90,
    "rirTarget": "0-1",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  },
  {
    "id": "lower-b:7",
    "templateId": "lower-b",
    "exerciseId": "hanging-knee-raise-or-captain-s-chair-raise",
    "order": 7,
    "targetSets": 3,
    "repMin": 10,
    "repMax": 20,
    "perSide": false,
    "restMin": 60,
    "restMax": 75,
    "rirTarget": "1-2",
    "warmupSets": 0,
    "countsTowardVolume": true,
    "progressionRule": "Rep Progression",
    "exerciseType": "isolation",
    "isMainLift": false,
    "notes": undefined
  }
];

export const seedVolumeTargets: VolumeTarget[] = [
  {
    "muscle": "chest",
    "label": "Chest",
    "targetSets": 18,
    "minSets": 16,
    "maxSets": 20,
    "note": undefined
  },
  {
    "muscle": "back_lats_upper_back",
    "label": "Back / Lats",
    "targetSets": 16,
    "minSets": 14,
    "maxSets": 18,
    "note": undefined
  },
  {
    "muscle": "side_delts",
    "label": "Side Delts",
    "targetSets": 8,
    "minSets": 6,
    "maxSets": 10,
    "note": undefined
  },
  {
    "muscle": "rear_delts",
    "label": "Rear Delts",
    "targetSets": 6,
    "minSets": 4,
    "maxSets": 8,
    "note": "6 direct + rows + face pull external rotation"
  },
  {
    "muscle": "front_delts",
    "label": "Front Delts",
    "targetSets": 2,
    "minSets": 0,
    "maxSets": 4,
    "note": "2 direct + all pressing"
  },
  {
    "muscle": "biceps",
    "label": "Biceps",
    "targetSets": 8,
    "minSets": 6,
    "maxSets": 10,
    "note": "8 direct + all pulling"
  },
  {
    "muscle": "triceps",
    "label": "Triceps",
    "targetSets": 8,
    "minSets": 6,
    "maxSets": 10,
    "note": "8 direct + all pressing"
  },
  {
    "muscle": "quads",
    "label": "Quads",
    "targetSets": 18,
    "minSets": 16,
    "maxSets": 20,
    "note": "direct/effective; trimmed from ~20 for recovery"
  },
  {
    "muscle": "hamstrings",
    "label": "Hamstrings",
    "targetSets": 12,
    "minSets": 10,
    "maxSets": 14,
    "note": undefined
  },
  {
    "muscle": "glutes",
    "label": "Glutes",
    "targetSets": 14,
    "minSets": 12,
    "maxSets": 16,
    "note": "effective sets across hinges, hyperext, split squats"
  },
  {
    "muscle": "calves",
    "label": "Calves",
    "targetSets": 10,
    "minSets": 8,
    "maxSets": 12,
    "note": undefined
  },
  {
    "muscle": "abs_core",
    "label": "Abs / Core",
    "targetSets": 9,
    "minSets": 7,
    "maxSets": 11,
    "note": "includes anti-rotation (Pallof)"
  }
];

export const seedWeeklySchedule: WeeklyScheduleDay[] = [
  {
    "id": "monday",
    "dayIndex": 0,
    "day": "Monday",
    "type": "workout",
    "label": "Upper A",
    "templateId": "upper-a"
  },
  {
    "id": "tuesday",
    "dayIndex": 1,
    "day": "Tuesday",
    "type": "workout",
    "label": "Lower A",
    "templateId": "lower-a"
  },
  {
    "id": "wednesday",
    "dayIndex": 2,
    "day": "Wednesday",
    "type": "cardio_or_rest",
    "label": "Zone 2 / Recovery",
    "cardioMinMinutes": 30,
    "cardioMaxMinutes": 45
  },
  {
    "id": "thursday",
    "dayIndex": 3,
    "day": "Thursday",
    "type": "workout",
    "label": "Upper B",
    "templateId": "upper-b"
  },
  {
    "id": "friday",
    "dayIndex": 4,
    "day": "Friday",
    "type": "workout",
    "label": "Lower B",
    "templateId": "lower-b"
  },
  {
    "id": "saturday",
    "dayIndex": 5,
    "day": "Saturday",
    "type": "cardio",
    "label": "Cardio Day",
    "cardioMinMinutes": 35,
    "cardioMaxMinutes": 60,
    "note": "scale down if performance is dropping"
  },
  {
    "id": "sunday",
    "dayIndex": 6,
    "day": "Sunday",
    "type": "rest",
    "label": "Full Rest",
    "note": "walking/mobility only"
  }
];

export const seedProgramMeta: ProgramMeta = {
  "id": "program",
  "name": "Max Productive Upper/Lower Split",
  "version": "2026-06-26-rev2",
  "seedVersion": "v2-maxvol-2026-06-26",
  "experienceLevel": "advanced",
  "goal": "hypertrophy_with_strength",
  "philosophy": {
    "compoundRIR": "1-2",
    "isolationRIR": "0-1",
    "avoidTrueFailureOn": [
      "heavy squats",
      "heavy hinges"
    ],
    "warmupsCountTowardVolume": false
  },
  "deload": {
    "triggers": [
      "same movement pattern drops for 2 consecutive exposures",
      "RIR much lower than intended at same weight/reps",
      "repeated joint pain or soreness logged",
      "poor sleep/readiness with falling performance"
    ],
    "reduceMinPercent": 30,
    "reduceMaxPercent": 50,
    "durationWeeks": 1,
    "keepMovementPatterns": true,
    "avoidFailure": true
  },
  "warmup": {
    "firstCompoundRampSets": 2,
    "firstCompoundRampPercents": [
      50,
      75
    ],
    "secondHeavyCompoundRampSets": 1,
    "lowerDayActivation": [
      "glute bridges",
      "band walks",
      "90/90 hip work"
    ],
    "countsTowardVolume": false
  }
};

export const seedProgressionRules: ProgressionRuleInfo[] = [
  {
    "rule": "Double Progression",
    "usedFor": "Compounds and stable machine lifts",
    "trigger": "All working sets hit the top of the rep range at target RIR",
    "suggestion": "Increase load next session by the smallest practical jump",
    "notes": "Until then, keep the weight and add reps (total reps is the comparison metric)."
  },
  {
    "rule": "Rep Progression",
    "usedFor": "Isolation work",
    "trigger": "Clean reps near the top of the range across most sets",
    "suggestion": "Add a small load (or harder variation); build reps first",
    "notes": "Do not increase load too early."
  },
  {
    "rule": "Conservative Progression",
    "usedFor": "Heavy hinges (RDL) and deadlifts",
    "trigger": "Reps improve with reps in reserve and clean, pain-free notes",
    "suggestion": "Repeat the weight or take a small increase only",
    "notes": "Avoid aggressive jumps; watch low-back fatigue."
  },
  {
    "rule": "Deload",
    "usedFor": "Whole program",
    "trigger": "same movement pattern drops for 2 consecutive exposures; RIR much lower than intended at same weight/reps; repeated joint pain or soreness logged; poor sleep/readiness with falling performance",
    "suggestion": "Cut working sets 30-50% for 1 week, keep patterns, avoid failure",
    "notes": "Not a diagnosis — a cue to reduce fatigue and resensitize."
  }
];
