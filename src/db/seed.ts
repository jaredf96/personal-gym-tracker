// AUTO-GENERATED from personal_gym_tracker_template.xlsx by scripts/gen_seed.py
// Do not edit by hand — re-run the generator if the workbook changes.
// This is the workbook-derived seed data loaded into IndexedDB on first launch.
import type {
  Exercise,
  WorkoutTemplate,
  TemplateExercise,
  WorkoutSession,
  SetEntry,
  SwapGroup,
  VolumeTarget,
  ProgressionRuleInfo,
} from "../types";

export const seedExercises: Exercise[] = [
  {
    "id": "incline-db-press",
    "name": "Incline DB Press",
    "primaryMuscle": "Chest",
    "secondaryMuscles": [
      "Front delts",
      "triceps"
    ],
    "equipment": "Dumbbell",
    "movementPattern": "Press",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "defaultRestSeconds": 150,
    "progressionRule": "Double Progression"
  },
  {
    "id": "chest-supported-row",
    "name": "Chest-Supported Row",
    "primaryMuscle": "Back",
    "secondaryMuscles": [
      "Rear delts",
      "biceps"
    ],
    "equipment": "Mixed",
    "movementPattern": "Row/Pull",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "defaultRestSeconds": 120,
    "progressionRule": "Double Progression"
  },
  {
    "id": "machine-chest-press-or-flat-db-press",
    "name": "Machine Chest Press or Flat DB Press",
    "primaryMuscle": "Chest",
    "secondaryMuscles": [
      "Front delts",
      "triceps"
    ],
    "equipment": "Mixed",
    "movementPattern": "Press",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "defaultRestSeconds": 120,
    "progressionRule": "Double Progression"
  },
  {
    "id": "lat-pulldown",
    "name": "Lat Pulldown",
    "primaryMuscle": "Back",
    "secondaryMuscles": [
      "Biceps"
    ],
    "equipment": "Machine/Cable",
    "movementPattern": "Row/Pull",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "defaultRestSeconds": 120,
    "progressionRule": "Double Progression"
  },
  {
    "id": "lateral-raise",
    "name": "Lateral Raise",
    "primaryMuscle": "Side delts",
    "secondaryMuscles": [],
    "equipment": "Free weight/bodyweight",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 12,
    "defaultRepMax": 20,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "triceps-pressdown",
    "name": "Triceps Pressdown",
    "primaryMuscle": "Triceps",
    "secondaryMuscles": [],
    "equipment": "Machine/Cable",
    "movementPattern": "Press",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "db-curl-or-cable-curl",
    "name": "DB Curl or Cable Curl",
    "primaryMuscle": "Biceps",
    "secondaryMuscles": [],
    "equipment": "Mixed",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "squat-or-hack-squat",
    "name": "Squat or Hack Squat",
    "primaryMuscle": "Quads",
    "secondaryMuscles": [
      "Glutes",
      "adductors"
    ],
    "equipment": "Mixed",
    "movementPattern": "Squat/Knee",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "defaultRestSeconds": 180,
    "progressionRule": "Double Progression"
  },
  {
    "id": "romanian-deadlift",
    "name": "Romanian Deadlift",
    "primaryMuscle": "Hamstrings",
    "secondaryMuscles": [
      "Glutes",
      "lower back"
    ],
    "equipment": "Free weight/bodyweight",
    "movementPattern": "Hinge",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "defaultRestSeconds": 150,
    "progressionRule": "Conservative Progression"
  },
  {
    "id": "leg-press",
    "name": "Leg Press",
    "primaryMuscle": "Quads",
    "secondaryMuscles": [
      "Glutes"
    ],
    "equipment": "Free weight/bodyweight",
    "movementPattern": "Press",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "defaultRestSeconds": 120,
    "progressionRule": "Double Progression"
  },
  {
    "id": "seated-or-lying-leg-curl",
    "name": "Seated or Lying Leg Curl",
    "primaryMuscle": "Hamstrings",
    "secondaryMuscles": [],
    "equipment": "Mixed",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "defaultRestSeconds": 90,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "standing-or-seated-calf-raise",
    "name": "Standing or Seated Calf Raise",
    "primaryMuscle": "Calves",
    "secondaryMuscles": [],
    "equipment": "Mixed",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 8,
    "defaultRepMax": 15,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "cable-crunch-or-hanging-knee-raise",
    "name": "Cable Crunch or Hanging Knee Raise",
    "primaryMuscle": "Abs",
    "secondaryMuscles": [],
    "equipment": "Mixed",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 20,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "pull-up-or-lat-pulldown",
    "name": "Pull-Up or Lat Pulldown",
    "primaryMuscle": "Back",
    "secondaryMuscles": [
      "Biceps"
    ],
    "equipment": "Mixed",
    "movementPattern": "Row/Pull",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "defaultRestSeconds": 150,
    "progressionRule": "Double Progression"
  },
  {
    "id": "seated-db-shoulder-press-or-machine-press",
    "name": "Seated DB Shoulder Press or Machine Press",
    "primaryMuscle": "Shoulders",
    "secondaryMuscles": [
      "Triceps"
    ],
    "equipment": "Mixed",
    "movementPattern": "Press",
    "defaultRepMin": 6,
    "defaultRepMax": 10,
    "defaultRestSeconds": 150,
    "progressionRule": "Double Progression"
  },
  {
    "id": "cable-row",
    "name": "Cable Row",
    "primaryMuscle": "Back",
    "secondaryMuscles": [
      "Rear delts",
      "biceps"
    ],
    "equipment": "Machine/Cable",
    "movementPattern": "Row/Pull",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "defaultRestSeconds": 120,
    "progressionRule": "Double Progression"
  },
  {
    "id": "pec-deck-or-cable-fly",
    "name": "Pec Deck or Cable Fly",
    "primaryMuscle": "Chest",
    "secondaryMuscles": [],
    "equipment": "Mixed",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "defaultRestSeconds": 90,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "rear-delt-fly",
    "name": "Rear Delt Fly",
    "primaryMuscle": "Rear delts",
    "secondaryMuscles": [
      "Upper back"
    ],
    "equipment": "Free weight/bodyweight",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 12,
    "defaultRepMax": 20,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "incline-db-curl",
    "name": "Incline DB Curl",
    "primaryMuscle": "Biceps",
    "secondaryMuscles": [],
    "equipment": "Dumbbell",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "overhead-cable-triceps-extension",
    "name": "Overhead Cable Triceps Extension",
    "primaryMuscle": "Triceps",
    "secondaryMuscles": [],
    "equipment": "Machine/Cable",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "deadlift-variation-or-hip-thrust",
    "name": "Deadlift Variation or Hip Thrust",
    "primaryMuscle": "Glutes",
    "secondaryMuscles": [
      "Hamstrings",
      "lower back"
    ],
    "equipment": "Mixed",
    "movementPattern": "Hinge",
    "defaultRepMin": 5,
    "defaultRepMax": 8,
    "defaultRestSeconds": 180,
    "progressionRule": "Conservative Progression"
  },
  {
    "id": "front-squat-hack-squat-or-leg-press",
    "name": "Front Squat, Hack Squat, or Leg Press",
    "primaryMuscle": "Quads",
    "secondaryMuscles": [
      "Glutes"
    ],
    "equipment": "Mixed",
    "movementPattern": "Press",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "defaultRestSeconds": 150,
    "progressionRule": "Double Progression"
  },
  {
    "id": "bulgarian-split-squat-or-walking-lunge",
    "name": "Bulgarian Split Squat or Walking Lunge",
    "primaryMuscle": "Quads",
    "secondaryMuscles": [
      "Glutes"
    ],
    "equipment": "Mixed",
    "movementPattern": "Squat/Knee",
    "defaultRepMin": 8,
    "defaultRepMax": 12,
    "defaultRestSeconds": 120,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "leg-curl",
    "name": "Leg Curl",
    "primaryMuscle": "Hamstrings",
    "secondaryMuscles": [],
    "equipment": "Free weight/bodyweight",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 15,
    "defaultRestSeconds": 90,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "calf-raise",
    "name": "Calf Raise",
    "primaryMuscle": "Calves",
    "secondaryMuscles": [],
    "equipment": "Free weight/bodyweight",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 10,
    "defaultRepMax": 20,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  },
  {
    "id": "ab-wheel-plank-or-cable-crunch",
    "name": "Ab Wheel, Plank, or Cable Crunch",
    "primaryMuscle": "Abs",
    "secondaryMuscles": [],
    "equipment": "Mixed",
    "movementPattern": "Isolation/Core",
    "defaultRepMin": 8,
    "defaultRepMax": 20,
    "defaultRestSeconds": 60,
    "progressionRule": "Rep Progression"
  }
];

export const seedTemplates: WorkoutTemplate[] = [
  {
    "id": "upper-a",
    "name": "Upper A",
    "type": "Upper",
    "sequenceOrder": 1
  },
  {
    "id": "lower-a",
    "name": "Lower A",
    "type": "Lower",
    "sequenceOrder": 2
  },
  {
    "id": "upper-b",
    "name": "Upper B",
    "type": "Upper",
    "sequenceOrder": 3
  },
  {
    "id": "lower-b",
    "name": "Lower B",
    "type": "Lower",
    "sequenceOrder": 4
  }
];

export const seedTemplateExercises: TemplateExercise[] = [
  {
    "id": "upper-a:1",
    "templateId": "upper-a",
    "exerciseId": "incline-db-press",
    "order": 1,
    "targetSets": 3,
    "repMin": 6,
    "repMax": 10,
    "restSeconds": 150,
    "progressionRule": "Double Progression",
    "isMainLift": true,
    "notes": "Main press; keep shoulder-friendly setup."
  },
  {
    "id": "upper-a:2",
    "templateId": "upper-a",
    "exerciseId": "chest-supported-row",
    "order": 2,
    "targetSets": 3,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 120,
    "progressionRule": "Double Progression",
    "isMainLift": false,
    "notes": "Stable row variation; avoid low-back fatigue."
  },
  {
    "id": "upper-a:3",
    "templateId": "upper-a",
    "exerciseId": "machine-chest-press-or-flat-db-press",
    "order": 3,
    "targetSets": 3,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 120,
    "progressionRule": "Double Progression",
    "isMainLift": false,
    "notes": "Choose the version that feels best on shoulders."
  },
  {
    "id": "upper-a:4",
    "templateId": "upper-a",
    "exerciseId": "lat-pulldown",
    "order": 4,
    "targetSets": 3,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 120,
    "progressionRule": "Double Progression",
    "isMainLift": false,
    "notes": "Use controlled stretch and full range."
  },
  {
    "id": "upper-a:5",
    "templateId": "upper-a",
    "exerciseId": "lateral-raise",
    "order": 5,
    "targetSets": 3,
    "repMin": 12,
    "repMax": 20,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Controlled reps; slight cheat only near end."
  },
  {
    "id": "upper-a:6",
    "templateId": "upper-a",
    "exerciseId": "triceps-pressdown",
    "order": 6,
    "targetSets": 2,
    "repMin": 10,
    "repMax": 15,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Elbows fixed; do not turn into a press."
  },
  {
    "id": "upper-a:7",
    "templateId": "upper-a",
    "exerciseId": "db-curl-or-cable-curl",
    "order": 7,
    "targetSets": 2,
    "repMin": 10,
    "repMax": 15,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Pick whichever feels better on elbows."
  },
  {
    "id": "lower-a:1",
    "templateId": "lower-a",
    "exerciseId": "squat-or-hack-squat",
    "order": 1,
    "targetSets": 3,
    "repMin": 6,
    "repMax": 10,
    "restSeconds": 180,
    "progressionRule": "Double Progression",
    "isMainLift": true,
    "notes": "Quad-biased main lift."
  },
  {
    "id": "lower-a:2",
    "templateId": "lower-a",
    "exerciseId": "romanian-deadlift",
    "order": 2,
    "targetSets": 3,
    "repMin": 6,
    "repMax": 10,
    "restSeconds": 150,
    "progressionRule": "Conservative Progression",
    "isMainLift": false,
    "notes": "Stop before form breaks; track back fatigue notes."
  },
  {
    "id": "lower-a:3",
    "templateId": "lower-a",
    "exerciseId": "leg-press",
    "order": 3,
    "targetSets": 2,
    "repMin": 10,
    "repMax": 15,
    "restSeconds": 120,
    "progressionRule": "Double Progression",
    "isMainLift": false,
    "notes": "Use consistent foot position."
  },
  {
    "id": "lower-a:4",
    "templateId": "lower-a",
    "exerciseId": "seated-or-lying-leg-curl",
    "order": 4,
    "targetSets": 3,
    "repMin": 10,
    "repMax": 15,
    "restSeconds": 90,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Pause briefly in shortened position."
  },
  {
    "id": "lower-a:5",
    "templateId": "lower-a",
    "exerciseId": "standing-or-seated-calf-raise",
    "order": 5,
    "targetSets": 3,
    "repMin": 8,
    "repMax": 15,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Full stretch; avoid bouncing."
  },
  {
    "id": "lower-a:6",
    "templateId": "lower-a",
    "exerciseId": "cable-crunch-or-hanging-knee-raise",
    "order": 6,
    "targetSets": 2,
    "repMin": 10,
    "repMax": 20,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Add load when top reps are clean."
  },
  {
    "id": "upper-b:1",
    "templateId": "upper-b",
    "exerciseId": "pull-up-or-lat-pulldown",
    "order": 1,
    "targetSets": 3,
    "repMin": 6,
    "repMax": 10,
    "restSeconds": 150,
    "progressionRule": "Double Progression",
    "isMainLift": true,
    "notes": "Main vertical pull target."
  },
  {
    "id": "upper-b:2",
    "templateId": "upper-b",
    "exerciseId": "seated-db-shoulder-press-or-machine-press",
    "order": 2,
    "targetSets": 3,
    "repMin": 6,
    "repMax": 10,
    "restSeconds": 150,
    "progressionRule": "Double Progression",
    "isMainLift": true,
    "notes": "Use pain-free range."
  },
  {
    "id": "upper-b:3",
    "templateId": "upper-b",
    "exerciseId": "cable-row",
    "order": 3,
    "targetSets": 3,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 120,
    "progressionRule": "Double Progression",
    "isMainLift": false,
    "notes": "Keep torso position consistent."
  },
  {
    "id": "upper-b:4",
    "templateId": "upper-b",
    "exerciseId": "pec-deck-or-cable-fly",
    "order": 4,
    "targetSets": 3,
    "repMin": 10,
    "repMax": 15,
    "restSeconds": 90,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Controlled stretch; avoid shoulder irritation."
  },
  {
    "id": "upper-b:5",
    "templateId": "upper-b",
    "exerciseId": "rear-delt-fly",
    "order": 5,
    "targetSets": 3,
    "repMin": 12,
    "repMax": 20,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Think elbows out, not hands back."
  },
  {
    "id": "upper-b:6",
    "templateId": "upper-b",
    "exerciseId": "incline-db-curl",
    "order": 6,
    "targetSets": 2,
    "repMin": 10,
    "repMax": 15,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Stretch-focused biceps work."
  },
  {
    "id": "upper-b:7",
    "templateId": "upper-b",
    "exerciseId": "overhead-cable-triceps-extension",
    "order": 7,
    "targetSets": 2,
    "repMin": 10,
    "repMax": 15,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Long-head triceps emphasis."
  },
  {
    "id": "lower-b:1",
    "templateId": "lower-b",
    "exerciseId": "deadlift-variation-or-hip-thrust",
    "order": 1,
    "targetSets": 2,
    "repMin": 5,
    "repMax": 8,
    "restSeconds": 180,
    "progressionRule": "Conservative Progression",
    "isMainLift": true,
    "notes": "Choose based on recovery and low-back tolerance."
  },
  {
    "id": "lower-b:2",
    "templateId": "lower-b",
    "exerciseId": "front-squat-hack-squat-or-leg-press",
    "order": 2,
    "targetSets": 3,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 150,
    "progressionRule": "Double Progression",
    "isMainLift": true,
    "notes": "Secondary lower-body main target."
  },
  {
    "id": "lower-b:3",
    "templateId": "lower-b",
    "exerciseId": "bulgarian-split-squat-or-walking-lunge",
    "order": 3,
    "targetSets": 2,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 120,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Each leg; keep stable and controlled."
  },
  {
    "id": "lower-b:4",
    "templateId": "lower-b",
    "exerciseId": "leg-curl",
    "order": 4,
    "targetSets": 3,
    "repMin": 10,
    "repMax": 15,
    "restSeconds": 90,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Second hamstring curl exposure."
  },
  {
    "id": "lower-b:5",
    "templateId": "lower-b",
    "exerciseId": "calf-raise",
    "order": 5,
    "targetSets": 3,
    "repMin": 10,
    "repMax": 20,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Full stretch and pause."
  },
  {
    "id": "lower-b:6",
    "templateId": "lower-b",
    "exerciseId": "ab-wheel-plank-or-cable-crunch",
    "order": 6,
    "targetSets": 2,
    "repMin": 8,
    "repMax": 20,
    "restSeconds": 60,
    "progressionRule": "Rep Progression",
    "isMainLift": false,
    "notes": "Progress slowly; avoid sloppy reps."
  }
];

export const seedSwapGroups: SwapGroup[] = [
  {
    "id": "swap-1",
    "baseExercise": "Incline DB Press",
    "swapOption": "Incline Machine Press",
    "swapGroup": "Incline Press",
    "countsToward": "Chest",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Good when DB setup is busy."
  },
  {
    "id": "swap-2",
    "baseExercise": "Incline DB Press",
    "swapOption": "Smith Incline Press",
    "swapGroup": "Incline Press",
    "countsToward": "Chest",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Stable alternative."
  },
  {
    "id": "swap-3",
    "baseExercise": "Incline DB Press",
    "swapOption": "Flat DB Press",
    "swapGroup": "Horizontal Press",
    "countsToward": "Chest",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Less incline/front delt emphasis."
  },
  {
    "id": "swap-4",
    "baseExercise": "Incline DB Press",
    "swapOption": "Machine Chest Press",
    "swapGroup": "Horizontal Press",
    "countsToward": "Chest",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Shoulder-friendly option."
  },
  {
    "id": "swap-5",
    "baseExercise": "Chest-Supported Row",
    "swapOption": "Seated Cable Row",
    "swapGroup": "Horizontal Pull",
    "countsToward": "Back",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Good machine/cable swap."
  },
  {
    "id": "swap-6",
    "baseExercise": "Chest-Supported Row",
    "swapOption": "Machine Row",
    "swapGroup": "Horizontal Pull",
    "countsToward": "Back",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Very comparable."
  },
  {
    "id": "swap-7",
    "baseExercise": "Chest-Supported Row",
    "swapOption": "One-Arm DB Row",
    "swapGroup": "Horizontal Pull",
    "countsToward": "Back",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "More setup and bracing required."
  },
  {
    "id": "swap-8",
    "baseExercise": "Squat or Hack Squat",
    "swapOption": "Hack Squat",
    "swapGroup": "Squat/Knee Dominant",
    "countsToward": "Quads",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Great quad-biased option."
  },
  {
    "id": "swap-9",
    "baseExercise": "Squat or Hack Squat",
    "swapOption": "Leg Press",
    "swapGroup": "Squat/Knee Dominant",
    "countsToward": "Quads",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Less technical; stable."
  },
  {
    "id": "swap-10",
    "baseExercise": "Squat or Hack Squat",
    "swapOption": "Smith Squat",
    "swapGroup": "Squat/Knee Dominant",
    "countsToward": "Quads",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Consistent setup matters."
  },
  {
    "id": "swap-11",
    "baseExercise": "Romanian Deadlift",
    "swapOption": "Dumbbell RDL",
    "swapGroup": "Hinge",
    "countsToward": "Hamstrings",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Similar pattern with different load limit."
  },
  {
    "id": "swap-12",
    "baseExercise": "Romanian Deadlift",
    "swapOption": "Smith RDL",
    "swapGroup": "Hinge",
    "countsToward": "Hamstrings",
    "comparisonRule": "Same muscle volume, separate PR history",
    "notes": "Stable bar path."
  },
  {
    "id": "swap-13",
    "baseExercise": "Romanian Deadlift",
    "swapOption": "Hip Thrust",
    "swapGroup": "Hip Extension",
    "countsToward": "Glutes",
    "comparisonRule": "Not identical; glute-biased substitute",
    "notes": "Use when low back/hamstrings need a break."
  },
  {
    "id": "swap-14",
    "baseExercise": "Romanian Deadlift",
    "swapOption": "Seated Leg Curl + Back Extension",
    "swapGroup": "Hinge Substitute",
    "countsToward": "Hamstrings",
    "comparisonRule": "Volume preserved, not direct PR comparison",
    "notes": "Good workaround if hinges feel bad."
  }
];

export const seedVolumeTargets: VolumeTarget[] = [
  {
    "muscle": "Chest",
    "minSets": 8,
    "maxSets": 12,
    "directPrimarySets": 9,
    "notes": "Primary/direct sets only. Pressing and flys."
  },
  {
    "muscle": "Back",
    "minSets": 12,
    "maxSets": 16,
    "directPrimarySets": 12,
    "notes": "Primary/direct sets only. Rows + pulldowns/pullups."
  },
  {
    "muscle": "Quads",
    "minSets": 10,
    "maxSets": 14,
    "directPrimarySets": 10,
    "notes": "Primary/direct sets only. Squat/hack/leg press/lunges."
  },
  {
    "muscle": "Hamstrings",
    "minSets": 8,
    "maxSets": 12,
    "directPrimarySets": 9,
    "notes": "Primary/direct sets only. RDL/hinges + curls."
  },
  {
    "muscle": "Glutes",
    "minSets": 4,
    "maxSets": 10,
    "directPrimarySets": 2,
    "notes": "Primary/direct sets only. Also receives indirect work on squats/hinges."
  },
  {
    "muscle": "Side delts",
    "minSets": 5,
    "maxSets": 12,
    "directPrimarySets": 3,
    "notes": "Primary/direct sets only. Direct lateral raise volume."
  },
  {
    "muscle": "Rear delts",
    "minSets": 3,
    "maxSets": 8,
    "directPrimarySets": 3,
    "notes": "Primary/direct sets only. Rows add indirect rear-delt work."
  },
  {
    "muscle": "Biceps",
    "minSets": 4,
    "maxSets": 10,
    "directPrimarySets": 4,
    "notes": "Primary/direct sets only. Pulling adds indirect biceps work."
  },
  {
    "muscle": "Triceps",
    "minSets": 4,
    "maxSets": 10,
    "directPrimarySets": 4,
    "notes": "Primary/direct sets only. Pressing adds indirect triceps work."
  },
  {
    "muscle": "Calves",
    "minSets": 6,
    "maxSets": 12,
    "directPrimarySets": 6,
    "notes": "Primary/direct sets only. Two lower days."
  },
  {
    "muscle": "Abs",
    "minSets": 4,
    "maxSets": 10,
    "directPrimarySets": 4,
    "notes": "Primary/direct sets only. Two lower days."
  }
];

export const seedProgressionRules: ProgressionRuleInfo[] = [
  {
    "rule": "Double Progression",
    "usedFor": "Compounds and stable machine lifts",
    "trigger": "User hits top of rep range on all target sets",
    "suggestion": "Increase load next session by smallest practical jump",
    "notes": "Example 3x6-10: 10/10/10 means increase. 10/9/8 means stay and add reps."
  },
  {
    "rule": "Rep Progression",
    "usedFor": "Isolation work",
    "trigger": "User approaches top of rep range across most sets",
    "suggestion": "Add small load or move to harder variation",
    "notes": "For 3x12-20, do not increase too early. Build clean reps first."
  },
  {
    "rule": "Conservative Progression",
    "usedFor": "RDLs, deadlifts, heavy hinges",
    "trigger": "Reps improve and RIR remains 1-3 with clean notes",
    "suggestion": "Same weight or small increase",
    "notes": "Avoid aggressive increases when low-back fatigue/pain notes appear."
  },
  {
    "rule": "Fatigue Warning",
    "usedFor": "All exercises",
    "trigger": "Performance down 2+ sessions in a row",
    "suggestion": "Consider longer rest, lower volume, deload, or exercise swap",
    "notes": "Do not diagnose injury; treat pain notes as a warning to adjust."
  },
  {
    "rule": "Weekly Volume",
    "usedFor": "Muscle groups",
    "trigger": "Sets are below or above target range",
    "suggestion": "Preserve, add, or reduce sets depending on recovery and progress",
    "notes": "Weekly set volume should be a dashboard calculation."
  }
];

// One completed session + its sets, so last-session comparison and progression
// suggestions have data to work with on a fresh install.
export const seedSampleSession: WorkoutSession = {
  "id": "seed-session-1",
  "templateId": "upper-a",
  "date": "2026-06-25",
  "startedAt": "2026-06-25T18:00:00",
  "endedAt": "2026-06-25T18:42:00",
  "notes": "Seed session from workbook sample log."
};

export const seedSampleSets: SetEntry[] = [
  {
    "id": "seed-set-1",
    "sessionId": "seed-session-1",
    "exerciseId": "incline-db-press",
    "setNumber": 1,
    "weight": 70.0,
    "reps": 9,
    "rir": 1,
    "isWarmup": false,
    "notes": undefined,
    "createdAt": "2026-06-25T18:00:00"
  },
  {
    "id": "seed-set-2",
    "sessionId": "seed-session-1",
    "exerciseId": "incline-db-press",
    "setNumber": 2,
    "weight": 70.0,
    "reps": 8,
    "rir": 1,
    "isWarmup": false,
    "notes": undefined,
    "createdAt": "2026-06-25T18:02:00"
  },
  {
    "id": "seed-set-3",
    "sessionId": "seed-session-1",
    "exerciseId": "incline-db-press",
    "setNumber": 3,
    "weight": 70.0,
    "reps": 7,
    "rir": 0,
    "isWarmup": false,
    "notes": undefined,
    "createdAt": "2026-06-25T18:04:00"
  },
  {
    "id": "seed-set-4",
    "sessionId": "seed-session-1",
    "exerciseId": "chest-supported-row",
    "setNumber": 1,
    "weight": 120.0,
    "reps": 10,
    "rir": 2,
    "isWarmup": false,
    "notes": undefined,
    "createdAt": "2026-06-25T18:06:00"
  },
  {
    "id": "seed-set-5",
    "sessionId": "seed-session-1",
    "exerciseId": "chest-supported-row",
    "setNumber": 2,
    "weight": 120.0,
    "reps": 9,
    "rir": 1,
    "isWarmup": false,
    "notes": undefined,
    "createdAt": "2026-06-25T18:08:00"
  },
  {
    "id": "seed-set-6",
    "sessionId": "seed-session-1",
    "exerciseId": "chest-supported-row",
    "setNumber": 3,
    "weight": 120.0,
    "reps": 8,
    "rir": 1,
    "isWarmup": false,
    "notes": undefined,
    "createdAt": "2026-06-25T18:10:00"
  }
];
