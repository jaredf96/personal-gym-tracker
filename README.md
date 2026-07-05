# Personal Gym Tracker (MVP)

A local-first, mobile-first PWA for tracking your gym progress — a "Notes-app upgrade"
for fast workout logging, last-session comparison, and **deterministic** progressive-overload
suggestions. Data lives on-device (IndexedDB via Dexie) and works fully offline.

**Optional cloud sync:** add Supabase env vars to enable accounts (login/signup) and per-user
cloud persistence with row-level security. With no env vars set, the app runs exactly as before —
local-only, no login. See [Cloud sync & accounts](#cloud-sync--accounts-supabase-optional).

Seeded from `personal_gym_tracker_template.xlsx` (a 4-day Upper/Lower split).

## Run it locally

```bash
npm install
npm run dev
```

Open the printed URL (defaults to <http://localhost:5173>). The dev server also binds to your
LAN, so you can open the Network URL on your phone and "Add to Home Screen" to use it as an app.

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build (service worker active here)
npm run typecheck  # types only
npm test           # vitest suite for the deterministic training engine
```

On first launch the app seeds IndexedDB from the workbook (exercise library, the four
templates, swap groups, volume targets, progression-rule reference) plus one sample Upper A
session dated a few days ago so last-session comparison works immediately.

## What you can do

- **Today** — see the next workout in the rotation (sequence-based, not weekday-based), start it,
  or pick any specific day. Quick readiness check-in. Last-session recap.
- **Workout Logger** — per-exercise cards showing target sets, rep range, rest, progression rule,
  the template coaching note, **your last performance**, and the **deterministic next-set
  suggestion**. Log weight / reps / RIR / warmup vs working, optional notes. A rest timer starts
  after each working set. Finish to save.
- **Summary** (after finishing) — totals, per-exercise improved/matched/regressed vs last time,
  the suggestion for next time, rule-engine flags, and a one-tap **Coach Summary**.
- **History** — every logged exercise, with per-session best set / total reps / total volume,
  PR badges, and a volume sparkline.
- **Progress** — weekly hard sets by muscle vs the workbook's target ranges (low / in range / high),
  plus a bodyweight summary.
- **Settings / Backup** — units & increment settings, body metrics, JSON export/import, reset.

## How the workbook maps to the app

| Workbook sheet | App |
| --- | --- |
| Exercise Library | `exercises` table (26) |
| Workout Template | `workoutTemplates` (4) + `templateExercises` (26) |
| Progression Rules | logic in `src/engine/progression.ts` + `flags.ts`; text kept in `progressionRules` |
| Swap Groups | `swapGroups` table |
| Volume Targets | `volumeTargets` table → the Progress dashboard |
| Sample Log | one seeded completed session + its sets |

Seed data is **generated** from the workbook so the split stays editable/data-driven instead of
hard-coded in components:

```bash
python3 scripts/gen_seed.py /path/to/personal_gym_tracker_template.xlsx   # rewrites src/db/seed.ts
```

## Architecture

```
src/
  types.ts            # domain model (one source of truth)
  db/                 # Dexie schema, generated seed, seed runner, repo (queries), JSON backup
  engine/             # DETERMINISTIC training engine — the source of truth for all numbers
    stats.ts          #   per-session set statistics + est. 1RM
    comparison.ts     #   today vs last (reps / best set / volume / improved|matched|regressed)
    progression.ts    #   double / rep / conservative progression rules
    volume.ts         #   weekly hard sets by muscle vs targets
    flags.ts          #   rule-engine warnings (fatigue, pain note, volume, ready-to-progress)
    rotation.ts       #   sequence-based "next workout" (skipping days never breaks it)
    analysis.ts       #   ties repo + engine into plan / session / history views
  ai/                 # AI coach layer — explains engine facts, never invents numbers
    types.ts          #   CoachContext / CoachReport / CoachProvider
    coachContext.ts   #   builds the COMPACT context (never the whole DB)
    coachPrompts.ts   #   system+user prompts for a future real LLM
    coachService.ts   #   orchestrates context -> provider -> saved AiReport
    providers/        #   CoachProvider interface + MockCoachProvider
  screens/ components/ # mobile-first UI (React Router + Dexie live queries)
```

### Progression engine (deterministic, rule-based — no AI)

- **Double Progression** (compounds/machines): hold the weight until every working set reaches the
  top of the rep range, then suggest the smallest practical weight jump; otherwise "stay and add
  reps" using total reps as the comparison metric.
- **Rep Progression** (isolations): build clean reps toward the top of the range first, then a small
  load bump.
- **Conservative Progression** (heavy hinges/deadlifts): prefers "repeat weight"; only offers a small
  optional increase when sets topped out *with* reps in reserve and no fatigue/pain note.

### AI coach (skeleton, mock provider now)

The deterministic engine computes the facts first; the AI only summarizes them.

- The mock provider (`src/ai/providers/MockCoachProvider.ts`) writes a realistic summary purely from
  the engine-provided `CoachContext`. It never invents weights/reps.
- Only a small, structured `CoachContext` is built (`src/ai/coachContext.ts`) — never the whole DB.
- To add a real provider (OpenAI / Anthropic / local LLM / custom endpoint): implement
  `CoachProvider`, **POST the prompts to your own backend/serverless endpoint** that holds the API
  key, and register it in `coachService.ts`. **Do not put an API key in this frontend.** See the
  `TODO` comments in `providers/CoachProvider.ts` and `coachService.ts`.

## Cloud sync & accounts (Supabase, optional)

The app is local-first. Adding Supabase turns on accounts + per-user cloud persistence **without
changing how the app works** — Dexie stays the local store and offline cache; once signed in,
Supabase becomes the per-user source of truth and Dexie syncs to it.

**1. Create a Supabase project** (free tier) and, in the SQL Editor, run
[`supabase/schema.sql`](supabase/schema.sql). It creates one table per entity, each shaped
`(user_id, id, data jsonb, updated_at)` with **Row Level Security** (`auth.uid() = user_id`) so a
user can only ever read/write their own rows.

**2. Enable Email auth** in Supabase → Authentication → Providers → Email. (For the smoothest first
run you can turn off "Confirm email"; otherwise users confirm via email before first sign-in.)

**3. Set env vars** — copy `.env.example` to `.env.local` and fill in (Project Settings → API):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Both are **public client values** (safe in the frontend; RLS is the security boundary). **Never**
put the `service_role` key in the app.

**Behavior once configured:**
- All app routes are protected behind a login/signup screen; sessions persist across refreshes.
- Each change writes through to Supabase (debounced); deletes propagate; **Settings → Sync now**
  forces a full reconcile.
- On first sign-in, any existing local (pre-account) data is **adopted** and pushed to your account
  rather than discarded. Signing in as a different user on the same device swaps to that user's data.
- Manual JSON **Export/Import** still works as an extra backup.
- Known MVP limit: conflict resolution is last-write-wins (single-device oriented).

## Deploy to Vercel

This is a static SPA (HashRouter), so deployment is just a static build.

1. Push the repo to GitHub and **Import** it in Vercel (framework auto-detected as Vite;
   [`vercel.json`](vercel.json) pins build `npm run build`, output `dist`, and SPA rewrites).
2. In Vercel → Project → **Settings → Environment Variables**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (the same public values). Redeploy.
3. In Supabase → Authentication → URL Configuration, add your Vercel URL to the allowed redirect/site
   URLs.

The build succeeds with or without the env vars (no vars → local-only mode). On your iPhone, open
the deployed URL in Safari → **Add to Home Screen** for an installable, offline PWA.

## AI coach (already a clean placeholder)

The future-AI seam already exists and satisfies the "structured summaries, not raw state"
requirement — `src/ai/` (`types.ts`, `coachContext.ts`, `coachService.ts`,
`providers/MockCoachProvider.ts`). `coachContext.ts` builds a compact structured summary from the
deterministic engine; the provider only explains it. To add a real LLM later, implement
`CoachProvider`, route it through your own backend endpoint (see the `TODO`s), and register it in
`coachService.ts`. No API keys in the frontend.

## Notes

- **PWA**: `public/manifest.webmanifest` + `public/sw.js` (app-shell offline cache, registered in
  production builds only) + icons. Installable and works offline; all data is local.
- **Backups are your sync**: there is no cloud. Use Settings → Export JSON regularly; Import validates
  the file and restores in a single transaction (replace or merge).
- `npm audit` reports an esbuild/vite **dev-server-only** advisory. It does not affect the production
  build or this single-user local app; fixing it requires a major Vite bump, intentionally deferred.
```
