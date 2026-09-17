# Decisions

Recorded choices that are not obvious from the code. Contradicting one is a finding.

## 2026-09-16 — Deletes converge per device, not through the cloud

Deleted rows are carried by local tombstones (`src/db/tombstones.ts`), kept 90 days: no push
uploads a tombstoned row, no pull restores one, and a pull that finds one back in the cloud
deletes it again (commit 2b8a873).

- **Rejected: a cloud deletion log (new Supabase table).** Needs a schema change the user has
  to apply by hand; the fix had to work on the deployed schema.
- **Rejected: soft-delete markers in the existing tables.** A stale device's startup full push
  overwrites the marker with its live copy, so the row comes back anyway.
- **Accepted limit:** a device that never saw the delete re-uploads the row until it is deleted
  there too; the deleting device quietly re-deletes it on each pull.

## 2026-09-16 — Empty sessions from earlier days are never auto-deleted

An unfinished session dated before today with no sets does not count as in progress
(`src/engine/activeSession.ts`); it stays on the calendar and is discarded by hand.

- **Rejected: deleting it at boot or when a workout starts.** Its sets may not have synced
  down yet — an earlier repair that deleted "empty" sessions destroyed real history that way.

## 2026-09-16 — Splitting a combined exercise keeps its id

"Pec Deck or Cable Fly" became Pec Deck + Cable Fly by pinning the existing ids in the program
file (`id`, `alternatives`), so history maps by slot (Upper A → Pec Deck, Upper B → Cable
Fly), no logged set is rewritten, and `SEED_VERSION` does not change (commit 4fd2b66).

- **Rejected: start both fresh** (history stranded under a retired name, needs a retired flag).
- **Rejected: move all past sets to one variant** (rewrites synced log data).
- User's choice. Apply the same pattern to later splits, asking which variant each slot's
  history mostly was.

## 2026-09-16 — Pain notes change prep, never weights

A pain note on a body area adds one warm-up set to lifts that load it and a stretch list,
until 2 later sessions train the area without a new note, or 14 days (commit 99c45fa).

- **Rejected: holding load on affected lifts** — user chose warm-ups and stretches only.
- **Rejected: "next workout only" and "until marked resolved"** — user chose the
  2-session / 14-day rule (no new synced state).
