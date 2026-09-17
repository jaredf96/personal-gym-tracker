// Pure decision rules for the sync layer, free of Supabase and Dexie so the
// delete-vs-restore behavior can be unit tested.

export interface PullPlan<T> {
  /** Cloud rows to write locally. */
  toPut: T[];
  /** Ids this device deleted that the cloud holds again — delete them there. */
  redelete: string[];
}

/**
 * Decide what an additive pull does with the cloud rows of one table.
 *
 * A tombstoned id is never restored, however it got back into the cloud (a push
 * that raced the delete, or another device that still holds the row); instead
 * it is queued to be deleted from the cloud again. A tombstoned id that also
 * exists locally has a stale marker, so it is neither restored nor re-deleted —
 * live data must never be removed from the cloud.
 */
export function planPull<T>(
  cloudRows: T[],
  idOf: (row: T) => string,
  opts: {
    tombstoned: Set<string>;
    localIds: Set<string>;
    touchedSincePull: (id: string) => boolean;
  }
): PullPlan<T> {
  const toPut: T[] = [];
  const redelete: string[] = [];
  for (const row of cloudRows) {
    const id = idOf(row);
    if (opts.tombstoned.has(id)) {
      if (!opts.localIds.has(id)) redelete.push(id);
      continue;
    }
    // Written locally while the pull was in flight — the local version wins.
    if (opts.touchedSincePull(id)) continue;
    toPut.push(row);
  }
  return { toPut, redelete };
}

/** Rows safe to upload: never one this device has deleted. */
export function withoutDeleted<T>(
  rows: T[],
  idOf: (row: T) => string,
  tombstoned: Set<string>
): T[] {
  return tombstoned.size ? rows.filter((r) => !tombstoned.has(idOf(r))) : rows;
}

/**
 * Whether the local cache (and the deletes recorded against it) belongs to
 * this user. No recorded owner means data from before any sign-in, which the
 * first account adopts. Any other owner's cache is cleared before it syncs.
 */
export function ownsLocalCache(owner: string | null, userId: string): boolean {
  return !owner || owner === userId;
}
