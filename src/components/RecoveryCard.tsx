import { useState } from "react";
import { db } from "../db/db";
import { fetchCloudSessions, restoreSessionsFromCloud, type RemoteSessionRow } from "../sync/supabaseSync";
import { useToast } from "./Toast";
import { Pill } from "./ui";
import { listSnapshots, restoreSnapshot, type SnapshotMeta } from "../db/snapshot";

interface LocalRow {
  id: string;
  templateId: string;
  date: string;
  ended: boolean;
  sets: number;
}

// Shows EVERY session that exists, local and cloud, whether or not the
// calendar renders it. Built after workouts went missing from the calendar:
// when data is hidden, the first job is to make it visible again.
export default function RecoveryCard() {
  const toast = useToast();
  const [local, setLocal] = useState<LocalRow[] | null>(null);
  const [cloud, setCloud] = useState<RemoteSessionRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [snaps, setSnaps] = useState<SnapshotMeta[]>([]);

  async function scan() {
    setBusy(true);
    try {
      const sessions = await db.workoutSessions.toArray();
      const rows: LocalRow[] = [];
      for (const s of sessions) {
        rows.push({
          id: s.id,
          templateId: s.templateId,
          date: s.date,
          ended: !!s.endedAt,
          sets: await db.setEntries.where("sessionId").equals(s.id).count(),
        });
      }
      rows.sort((a, b) => b.date.localeCompare(a.date));
      setLocal(rows);
      setSnaps(listSnapshots());
      try {
        setCloud(await fetchCloudSessions());
      } catch {
        setCloud(null); // local-only mode or offline
      }
    } finally {
      setBusy(false);
    }
  }

  const missingLocally = (cloud ?? []).filter((c) => !c.inLocal);

  return (
    <div className="card">
      <h3 className="mb">Recovery</h3>
      <p className="small muted" style={{ marginTop: 0 }}>
        Lists every workout stored on this device and in your account — including any the calendar
        isn't showing.
      </p>

      <button className="btn-block" onClick={scan} disabled={busy}>
        {busy ? "Scanning…" : "Scan for workouts"}
      </button>

      {local && (
        <>
          <div className="row wrap mt">
            <Pill>{local.length} on device</Pill>
            {cloud && <Pill>{cloud.length} in cloud</Pill>}
            {missingLocally.length > 0 && (
              <Pill tone="amber">{missingLocally.length} only in cloud</Pill>
            )}
          </div>

          {missingLocally.length > 0 && (
            <button
              className="btn-primary btn-block mt"
              onClick={async () => {
                setBusy(true);
                try {
                  const n = await restoreSessionsFromCloud();
                  toast.show(`Restored ${n} session(s) from the cloud`);
                  await scan();
                } catch (e) {
                  toast.show(`Restore failed: ${(e as Error).message}`);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Restore {missingLocally.length} missing workout(s)
            </button>
          )}

          <div className="mt">
            {local.length === 0 && <div className="faint tiny">No sessions on this device.</div>}
            {local.map((r) => (
              <div key={r.id} className="list-row">
                <div>
                  <div className="small">
                    {r.date} · {r.templateId}
                  </div>
                  <div className="faint tiny">
                    {r.sets} set{r.sets === 1 ? "" : "s"} · {r.ended ? "finished" : "unfinished"}
                  </div>
                </div>
                {!r.ended && r.sets > 0 && (
                  <button
                    className="btn-sm"
                    onClick={async () => {
                      const sets = await db.setEntries.where("sessionId").equals(r.id).toArray();
                      const lastAt = sets.map((s) => s.createdAt).sort().slice(-1)[0];
                      const s = await db.workoutSessions.get(r.id);
                      if (s) await db.workoutSessions.put({ ...s, endedAt: lastAt });
                      toast.show("Workout finished — check the calendar");
                      await scan();
                    }}
                  >
                    Finish
                  </button>
                )}
              </div>
            ))}
          </div>

          {snaps.length > 0 && (
            <div className="mt">
              <div className="faint tiny mb">Local safety snapshots:</div>
              {snaps.map((sn, i) => (
                <div key={sn.takenAt} className="list-row">
                  <div>
                    <div className="small">
                      {new Date(sn.takenAt).toLocaleString()}
                    </div>
                    <div className="faint tiny">
                      {sn.sessionCount} sessions · {sn.setCount} sets · {sn.reason}
                    </div>
                  </div>
                  <button
                    className="btn-sm"
                    onClick={async () => {
                      const r = await restoreSnapshot(i);
                      toast.show(`Merged ${r.sessions} sessions / ${r.sets} sets`);
                      await scan();
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}

          {cloud && missingLocally.length > 0 && (
            <div className="mt">
              <div className="faint tiny mb">Only in the cloud:</div>
              {missingLocally.map((c) => (
                <div key={c.id} className="list-row">
                  <div className="small">
                    {c.date} · {c.templateId}
                  </div>
                  <span className="faint tiny">{c.cloudSetCount} sets</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
