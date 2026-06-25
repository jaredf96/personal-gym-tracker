#!/usr/bin/env python3
"""Generate src/db/seed.ts from the personal_gym_tracker_template.xlsx workbook.

The workbook is the source of truth. Re-run this whenever the workbook changes:

    python3 scripts/gen_seed.py /path/to/personal_gym_tracker_template.xlsx

This keeps the workout split as editable, data-driven seed data rather than
logic hard-coded into React components.
"""
import json
import re
import sys
from datetime import datetime, timedelta

import openpyxl


def slug(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def split_muscles(v):
    if not v:
        return []
    return [m.strip() for m in str(v).split(";") if m.strip()]


def rows(ws):
    return list(ws.iter_rows(values_only=True))


def main(path: str):
    wb = openpyxl.load_workbook(path, data_only=True)

    # --- Exercise Library --------------------------------------------------
    lib = rows(wb["Exercise Library"])
    exercises = []
    name_to_id = {}
    for r in lib[1:]:
        if not r or not r[0]:
            continue
        eid = str(r[0]).strip()
        name = str(r[1]).strip()
        name_to_id[name] = eid
        exercises.append(
            {
                "id": eid,
                "name": name,
                "primaryMuscle": str(r[2]).strip(),
                "secondaryMuscles": split_muscles(r[3]),
                "equipment": str(r[4]).strip(),
                "movementPattern": str(r[5]).strip(),
                "defaultRepMin": int(r[6]),
                "defaultRepMax": int(r[7]),
                "defaultRestSeconds": int(r[8]),
                "progressionRule": str(r[9]).strip(),
            }
        )

    # --- Workout Template (templates + templateExercises) ------------------
    tmpl_rows = rows(wb["Workout Template"])
    templates = []
    template_exercises = []
    seq = {}
    seen_template = {}
    order_counter = 0
    for r in tmpl_rows[1:]:
        if not r or not r[0]:
            continue
        day = str(r[0]).strip()
        if day not in seen_template:
            order_counter += 1
            tid = slug(day)
            ttype = "Upper" if day.lower().startswith("upper") else "Lower"
            templates.append(
                {"id": tid, "name": day, "type": ttype, "sequenceOrder": order_counter}
            )
            seen_template[day] = tid
            seq[day] = order_counter
        tid = seen_template[day]
        ex_name = str(r[2]).strip()
        if ex_name not in name_to_id:
            raise SystemExit(f"Template exercise '{ex_name}' not found in Exercise Library")
        order = int(r[1])
        template_exercises.append(
            {
                "id": f"{tid}:{order}",
                "templateId": tid,
                "exerciseId": name_to_id[ex_name],
                "order": order,
                "targetSets": int(r[5]),
                "repMin": int(r[6]),
                "repMax": int(r[7]),
                "restSeconds": int(r[8]),
                "progressionRule": str(r[9]).strip(),
                "isMainLift": str(r[10]).strip().lower() == "yes",
                "notes": str(r[11]).strip() if r[11] else None,
            }
        )

    # --- Swap Groups -------------------------------------------------------
    swaps = []
    for i, r in enumerate(rows(wb["Swap Groups"])[1:]):
        if not r or not r[0]:
            continue
        swaps.append(
            {
                "id": f"swap-{i + 1}",
                "baseExercise": str(r[0]).strip(),
                "swapOption": str(r[1]).strip(),
                "swapGroup": str(r[2]).strip(),
                "countsToward": str(r[3]).strip(),
                "comparisonRule": str(r[4]).strip(),
                "notes": str(r[5]).strip() if r[5] else None,
            }
        )

    # --- Volume Targets ----------------------------------------------------
    vts = []
    for r in rows(wb["Volume Targets"])[1:]:
        if not r or not r[0]:
            continue
        vts.append(
            {
                "muscle": str(r[0]).strip(),
                "minSets": int(r[1]),
                "maxSets": int(r[2]),
                "directPrimarySets": int(r[3]),
                "notes": str(r[5]).strip() if r[5] else None,
            }
        )

    # --- Progression Rules (reference text for display) --------------------
    prog = []
    for r in rows(wb["Progression Rules"])[1:]:
        if not r or not r[0]:
            continue
        prog.append(
            {
                "rule": str(r[0]).strip(),
                "usedFor": str(r[1]).strip(),
                "trigger": str(r[2]).strip(),
                "suggestion": str(r[3]).strip(),
                "notes": str(r[4]).strip(),
            }
        )
    # de-dupe rule names (workbook lists Double Progression twice) keeping first
    seen_rule = set()
    prog_unique = []
    for p in prog:
        if p["rule"] in seen_rule:
            continue
        seen_rule.add(p["rule"])
        prog_unique.append(p)

    # --- Sample Log -> one completed seed session + set entries ------------
    sample = rows(wb["Sample Log"])[1:]
    sample_sets = []
    sample_session = None
    template_by_name = {t["name"]: t["id"] for t in templates}
    base = None
    for idx, r in enumerate(sample):
        if not r or not r[0]:
            continue
        date = str(r[0]).strip()[:10]
        workout = str(r[1]).strip()
        ex_name = str(r[2]).strip()
        if sample_session is None:
            base = datetime.fromisoformat(date + "T18:00:00")
            sample_session = {
                "id": "seed-session-1",
                "templateId": template_by_name.get(workout, slug(workout)),
                "date": date,
                "startedAt": base.isoformat(),
                "endedAt": (base + timedelta(minutes=42)).isoformat(),
                "notes": "Seed session from workbook sample log.",
            }
        created = (base + timedelta(minutes=idx * 2)).isoformat()
        sample_sets.append(
            {
                "id": f"seed-set-{idx + 1}",
                "sessionId": "seed-session-1",
                "exerciseId": name_to_id.get(ex_name, slug(ex_name)),
                "setNumber": int(r[3]),
                "weight": float(r[4]),
                "reps": int(r[5]),
                "rir": int(r[6]) if r[6] is not None else None,
                "isWarmup": bool(r[7]) if len(r) > 7 and r[7] is not None else False,
                "notes": (str(r[8]).strip() if len(r) > 8 and r[8] else None),
                "createdAt": created,
            }
        )

    def js(obj):
        return json.dumps(obj, indent=2, ensure_ascii=False)

    out = f"""// AUTO-GENERATED from personal_gym_tracker_template.xlsx by scripts/gen_seed.py
// Do not edit by hand — re-run the generator if the workbook changes.
// This is the workbook-derived seed data loaded into IndexedDB on first launch.
import type {{
  Exercise,
  WorkoutTemplate,
  TemplateExercise,
  WorkoutSession,
  SetEntry,
  SwapGroup,
  VolumeTarget,
  ProgressionRuleInfo,
}} from "../types";

export const seedExercises: Exercise[] = {js(exercises)};

export const seedTemplates: WorkoutTemplate[] = {js(templates)};

export const seedTemplateExercises: TemplateExercise[] = {js(template_exercises)};

export const seedSwapGroups: SwapGroup[] = {js(swaps)};

export const seedVolumeTargets: VolumeTarget[] = {js(vts)};

export const seedProgressionRules: ProgressionRuleInfo[] = {js(prog_unique)};

// One completed session + its sets, so last-session comparison and progression
// suggestions have data to work with on a fresh install.
export const seedSampleSession: WorkoutSession = {js(sample_session)};

export const seedSampleSets: SetEntry[] = {js(sample_sets)};
"""
    # tidy: null -> undefined-friendly (keep null; TS optional fields accept it at runtime,
    # but clean it for nicer typing by replacing "notes": null with omission is overkill).
    out = out.replace(": null", ": undefined")

    with open("src/db/seed.ts", "w") as f:
        f.write(out)
    print(
        f"Wrote src/db/seed.ts: {len(exercises)} exercises, {len(templates)} templates, "
        f"{len(template_exercises)} template exercises, {len(swaps)} swaps, "
        f"{len(vts)} volume targets, {len(prog_unique)} rules, {len(sample_sets)} sample sets."
    )


if __name__ == "__main__":
    wb_path = sys.argv[1] if len(sys.argv) > 1 else "/Users/jaredf/Downloads/personal_gym_tracker_template.xlsx"
    main(wb_path)
