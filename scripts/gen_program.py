#!/usr/bin/env python3
"""Generate src/db/seed.ts from program/max_volume_upper_lower_program.md.

The markdown's PROGRAM_DATA JSON block is the canonical source. Re-run after
editing the program:

    python3 scripts/gen_program.py

Keeps the split data-driven instead of hard-coded in components.
"""
import json
import re
import sys

SRC = "program/max_volume_upper_lower_program.md"
SEED_VERSION = "v2-maxvol-2026-06-26"

# Split colors (distinct on the dark theme).
COLORS = {
    "upperA": "#4f8cff",  # blue
    "lowerA": "#3ecf8e",  # green
    "upperB": "#b079f5",  # purple
    "lowerB": "#f2a44b",  # amber
}

# Raw primary muscle -> canonical weekly-volume target key.
MUSCLE_TO_TARGET = {
    "chest": "chest",
    "back": "back_lats_upper_back",
    "lats": "back_lats_upper_back",
    "side delts": "side_delts",
    "rear delts": "rear_delts",
    "front delts": "front_delts",
    "biceps": "biceps",
    "triceps": "triceps",
    "quads": "quads",
    "hamstrings": "hamstrings",
    "glutes": "glutes",
    "calves": "calves",
    "abs": "abs_core",
    "core": "abs_core",
    "obliques": "abs_core",
}

TARGET_LABELS = {
    "chest": "Chest",
    "back_lats_upper_back": "Back / Lats",
    "side_delts": "Side Delts",
    "rear_delts": "Rear Delts",
    "front_delts": "Front Delts",
    "biceps": "Biceps",
    "triceps": "Triceps",
    "quads": "Quads",
    "hamstrings": "Hamstrings",
    "glutes": "Glutes",
    "calves": "Calves",
    "abs_core": "Abs / Core",
}

VOLUME_BAND = 2  # +/- sets around the prescribed target for the in-range band


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def movement_pattern(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ["romanian deadlift", "deadlift", "rdl", "hyperextension"]):
        return "Hinge"
    if any(k in n for k in ["squat", "hack", "leg press", "split squat", "lunge"]):
        return "Squat/Knee"
    if any(k in n for k in ["row", "pulldown", "pull-up", "pull up"]):
        return "Row/Pull"
    if any(k in n for k in ["press", "bench"]):
        return "Press"
    return "Isolation/Core"


def progression_rule(name: str, ex_type: str) -> str:
    n = name.lower()
    if "romanian deadlift" in n or "deadlift" in n:
        return "Conservative Progression"
    return "Double Progression" if ex_type == "compound" else "Rep Progression"


def parse_reps(rep_range: str):
    per_side = "each" in rep_range.lower()
    nums = re.findall(r"\d+", rep_range)
    return int(nums[0]), int(nums[1]), per_side


def volume_muscles(primary):
    out = []
    for m in primary:
        key = MUSCLE_TO_TARGET.get(m.strip().lower())
        if key and key not in out:
            out.append(key)
    return out


def main():
    md = open(SRC).read()
    m = re.search(r"```json\s*(\{.*?\})\s*```", md, re.S)
    if not m:
        raise SystemExit("PROGRAM_DATA JSON block not found")
    data = json.loads(m.group(1))
    p = data["program"]

    workouts = p["workouts"]
    # sequence order from the order workout days appear in the weekly schedule
    seq_order = {}
    n = 0
    for d in p["weeklySchedule"]:
        if d["type"] == "workout":
            n += 1
            seq_order[d["workout"]] = n

    templates = []
    template_exercises = []
    exercises_by_id = {}

    for wkey, w in workouts.items():
        tid = slug(w["label"])
        est = w.get("estimatedMinutes", [0, 0])
        templates.append(
            {
                "id": tid,
                "name": w["label"],
                "type": "Upper" if "upper" in wkey.lower() else "Lower",
                "sequenceOrder": seq_order.get(wkey, len(templates) + 1),
                "color": COLORS.get(wkey, "#4f8cff"),
                "estMinMinutes": est[0],
                "estMaxMinutes": est[1],
            }
        )
        for ex in w["exercises"]:
            name = ex["name"]
            eid = slug(name)
            rmin, rmax, per_side = parse_reps(ex["repRange"])
            rest = ex["restSeconds"]
            ex_type = ex["type"]
            rule = progression_rule(name, ex_type)
            prim = ex["primaryMuscles"]
            sec = ex.get("secondaryMuscles", [])
            vmusc = volume_muscles(prim)

            if eid not in exercises_by_id:
                exercises_by_id[eid] = {
                    "id": eid,
                    "name": name,
                    "type": ex_type,
                    "primaryMuscles": prim,
                    "secondaryMuscles": sec,
                    "volumeMuscles": vmusc,
                    "movementPattern": movement_pattern(name),
                    "defaultRepMin": rmin,
                    "defaultRepMax": rmax,
                    "perSide": per_side,
                    "defaultRestMin": rest[0],
                    "defaultRestMax": rest[1],
                    "rirTarget": ex["rir"],
                    "defaultWarmupSets": ex.get("warmupSets", 0),
                    "progressionRule": rule,
                    "note": ex.get("note"),
                }

            template_exercises.append(
                {
                    "id": f"{tid}:{ex['order']}",
                    "templateId": tid,
                    "exerciseId": eid,
                    "order": ex["order"],
                    "targetSets": ex["sets"],
                    "repMin": rmin,
                    "repMax": rmax,
                    "perSide": per_side,
                    "restMin": rest[0],
                    "restMax": rest[1],
                    "rirTarget": ex["rir"],
                    "warmupSets": ex.get("warmupSets", 0),
                    "countsTowardVolume": ex.get("countsTowardVolume", True),
                    "progressionRule": rule,
                    "exerciseType": ex_type,
                    "isMainLift": ex["order"] == 1,
                    "notes": ex.get("note"),
                }
            )

    exercises = list(exercises_by_id.values())

    # Volume targets (single prescribed number -> in-range band).
    vt = p["weeklyVolumeTargets"]
    notes = vt.get("notes", {})
    volume_targets = []
    for key, target in vt.items():
        if key == "notes":
            continue
        volume_targets.append(
            {
                "muscle": key,
                "label": TARGET_LABELS.get(key, key),
                "targetSets": target,
                "minSets": max(0, target - VOLUME_BAND),
                "maxSets": target + VOLUME_BAND,
                "note": notes.get(key),
            }
        )

    # Weekly schedule (Monday index 0 .. Sunday index 6).
    schedule = []
    for i, d in enumerate(p["weeklySchedule"]):
        entry = {
            "id": d["day"].lower(),
            "dayIndex": i,
            "day": d["day"],
            "type": d["type"],
            "label": d["label"],
        }
        if d.get("workout"):
            entry["templateId"] = slug(workouts[d["workout"]]["label"])
        cm = d.get("cardioMinutes")
        if cm:
            entry["cardioMinMinutes"] = cm[0]
            entry["cardioMaxMinutes"] = cm[1]
        if d.get("note"):
            entry["note"] = d["note"]
        schedule.append(entry)

    # Program meta (philosophy + deload + warm-up).
    dl = p["deload"]
    action = dl["defaultAction"]
    program_meta = {
        "id": "program",
        "name": p["name"],
        "version": p["version"],
        "seedVersion": SEED_VERSION,
        "experienceLevel": p["experienceLevel"],
        "goal": p["goal"],
        "philosophy": p["philosophy"],
        "deload": {
            "triggers": dl["triggers"],
            "reduceMinPercent": action["reduceWorkingSetsPercent"][0],
            "reduceMaxPercent": action["reduceWorkingSetsPercent"][1],
            "durationWeeks": action["durationWeeks"],
            "keepMovementPatterns": action["keepMovementPatterns"],
            "avoidFailure": action["avoidFailure"],
        },
        "warmup": p["warmupProtocol"],
    }

    # Progression rule reference text (for display) incl. deload.
    progression_rules = [
        {
            "rule": "Double Progression",
            "usedFor": "Compounds and stable machine lifts",
            "trigger": "All working sets hit the top of the rep range at target RIR",
            "suggestion": "Increase load next session by the smallest practical jump",
            "notes": "Until then, keep the weight and add reps (total reps is the comparison metric).",
        },
        {
            "rule": "Rep Progression",
            "usedFor": "Isolation work",
            "trigger": "Clean reps near the top of the range across most sets",
            "suggestion": "Add a small load (or harder variation); build reps first",
            "notes": "Do not increase load too early.",
        },
        {
            "rule": "Conservative Progression",
            "usedFor": "Heavy hinges (RDL) and deadlifts",
            "trigger": "Reps improve with reps in reserve and clean, pain-free notes",
            "suggestion": "Repeat the weight or take a small increase only",
            "notes": "Avoid aggressive jumps; watch low-back fatigue.",
        },
        {
            "rule": "Deload",
            "usedFor": "Whole program",
            "trigger": "; ".join(dl["triggers"]),
            "suggestion": f"Cut working sets {action['reduceWorkingSetsPercent'][0]}-{action['reduceWorkingSetsPercent'][1]}% for {action['durationWeeks']} week, keep patterns, avoid failure",
            "notes": "Not a diagnosis — a cue to reduce fatigue and resensitize.",
        },
    ]

    def js(obj):
        return json.dumps(obj, indent=2, ensure_ascii=False).replace(": null", ": undefined")

    out = f"""// AUTO-GENERATED from program/max_volume_upper_lower_program.md by scripts/gen_program.py
// Do not edit by hand — re-run the generator if the program changes.
import type {{
  Exercise,
  WorkoutTemplate,
  TemplateExercise,
  VolumeTarget,
  WeeklyScheduleDay,
  ProgramMeta,
  ProgressionRuleInfo,
}} from "../types";

// Bump when the seeded program changes; triggers a local wipe + reseed.
export const SEED_VERSION = {json.dumps(SEED_VERSION)};

export const seedExercises: Exercise[] = {js(exercises)};

export const seedTemplates: WorkoutTemplate[] = {js(templates)};

export const seedTemplateExercises: TemplateExercise[] = {js(template_exercises)};

export const seedVolumeTargets: VolumeTarget[] = {js(volume_targets)};

export const seedWeeklySchedule: WeeklyScheduleDay[] = {js(schedule)};

export const seedProgramMeta: ProgramMeta = {js(program_meta)};

export const seedProgressionRules: ProgressionRuleInfo[] = {js(progression_rules)};
"""
    with open("src/db/seed.ts", "w") as f:
        f.write(out)
    print(
        f"Wrote src/db/seed.ts: {len(exercises)} exercises, {len(templates)} templates, "
        f"{len(template_exercises)} template exercises, {len(volume_targets)} volume targets, "
        f"{len(schedule)} schedule days."
    )


if __name__ == "__main__":
    sys.exit(main())
