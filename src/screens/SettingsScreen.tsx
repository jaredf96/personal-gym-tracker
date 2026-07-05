import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { reseedProgramData, SEED_VERSION_KEY } from "../db/seedRunner";
import {
  addBodyMetric,
  deleteBodyMetric,
  getSettings,
  listBodyMetrics,
} from "../db/repo";
import { downloadBackup, importBackup, readBackupFile } from "../db/backup";
import { availableProviders } from "../ai/coachService";
import type { Settings, Unit } from "../types";
import { todayISODate, relativeDay } from "../lib/dates";
import { fmtNum } from "../lib/format";
import { ScreenHeader, Pill } from "../components/ui";
import { useToast } from "../components/Toast";
import { useAuth } from "../auth/AuthProvider";
import { useSyncStatus } from "../sync/useSyncStatus";
import ScreenSkeleton from "../components/Skeleton";
import {
  syncNow,
  withSyncPaused,
  reconcileAfterImport,
  reconcileAfterReseed,
  eraseEverything,
  getSyncStatus,
  type SyncState,
} from "../sync/supabaseSync";

const SYNC_LABEL: Record<SyncState, string> = {
  disabled: "Local only",
  syncing: "Syncing…",
  idle: "Synced",
  offline: "Offline",
  error: "Sync error",
};
const SYNC_TONE: Record<SyncState, "green" | "amber" | "red" | "default"> = {
  disabled: "default",
  syncing: "amber",
  idle: "green",
  offline: "amber",
  error: "red",
};

export default function SettingsScreen() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { configured, user, signOut } = useAuth();
  const sync = useSyncStatus();

  const data = useLiveQuery(async () => {
    const [settings, metrics] = await Promise.all([getSettings(), listBodyMetrics()]);
    return { settings, metrics };
  }, []);

  // Body metric draft
  const [bw, setBw] = useState("");
  const [waist, setWaist] = useState("");

  if (!data) return <ScreenSkeleton />;
  const { settings, metrics } = data;

  async function patch(p: Partial<Settings>) {
    // Read fresh instead of spreading the render closure — two quick changes
    // (e.g. toggling unit then rest timer) must not revert each other.
    const current = await getSettings();
    await db.settings.put({ ...current, ...p });
  }

  async function saveBodyMetric() {
    if (bw === "" && waist === "") return;
    await addBodyMetric({
      date: todayISODate(),
      bodyweight: bw === "" ? undefined : parseFloat(bw),
      waist: waist === "" ? undefined : parseFloat(waist),
    });
    setBw("");
    setWaist("");
    toast.show("Body metric saved");
  }

  async function onExport() {
    await downloadBackup();
    toast.show("Backup downloaded");
  }

  async function onImportFile(file: File) {
    try {
      const json = await readBackupFile(file);
      const replace = window.confirm(
        "Replace ALL current data with this backup?\n\nOK = replace, Cancel = merge into existing data."
      );
      // Paused: no per-row sync traffic during the bulk rewrite; one bounded
      // reconcile afterwards keeps the cloud consistent with the import.
      const res = await withSyncPaused(() => importBackup(json, replace));
      if (res.ok) {
        const synced = await reconcileAfterImport(replace);
        toast.show(synced ? res.message : `${res.message} (cloud sync failed — use Sync now)`);
      } else {
        toast.show(res.message);
      }
    } catch (err) {
      toast.show(`Import failed: ${(err as Error).message}`);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function restoreSeed() {
    if (!window.confirm("Reload program data (exercises, templates, targets)? Your logs are kept."))
      return;
    try {
      // Paused so the reference-table clear doesn't fire per-row remote
      // deletes; one bounded reference-only reconcile afterwards.
      await withSyncPaused(() => reseedProgramData());
      const synced = await reconcileAfterReseed();
      toast.show(synced ? "Program data refreshed" : "Refreshed locally (cloud sync failed — use Sync now)");
    } catch (err) {
      toast.show(`Refresh failed: ${(err as Error).message}`);
    }
  }

  async function eraseAll() {
    const msg = configured
      ? "Erase ALL data permanently — on this device AND in your cloud account? This cannot be undone."
      : "Erase ALL local data permanently? This cannot be undone.";
    if (!window.confirm(msg)) return;
    try {
      await eraseEverything(); // clears cloud rows when signed in, stops sync
    } catch (err) {
      const ok = window.confirm(
        `Couldn't clear the cloud copy (${(err as Error).message}).\n\nErase local data anyway? The cloud copy will come back on next sign-in.`
      );
      if (!ok) {
        // eraseEverything already stopped sync — reload to restore it cleanly.
        window.location.reload();
        return;
      }
    }
    localStorage.removeItem(SEED_VERSION_KEY);
    await db.delete();
    toast.show("All data erased — reloading");
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className="screen">
      <ScreenHeader
        title="Settings"
        subtitle={configured ? "Cloud sync enabled" : "Local-first · stored only on this device"}
      />

      {/* Account / cloud sync */}
      {configured && (
        <div className="card" style={{ borderColor: "var(--accent-dim)" }}>
          <div className="row between">
            <div>
              <h3>Account</h3>
              <div className="muted small">{user?.email ?? "Signed in"}</div>
            </div>
            <Pill tone={SYNC_TONE[sync.state]}>{SYNC_LABEL[sync.state]}</Pill>
          </div>
          {sync.lastSyncedAt && (
            <div className="faint tiny mt">
              Last synced {new Date(sync.lastSyncedAt).toLocaleString()}
            </div>
          )}
          {sync.message && sync.state === "error" && (
            <div className="faint tiny mt" style={{ color: "var(--red)" }}>
              {sync.message}
            </div>
          )}
          <div className="row mt" style={{ gap: 8 }}>
            <button
              className="grow"
              onClick={async () => {
                const ok = await syncNow();
                toast.show(
                  ok ? "Sync complete" : `Sync failed: ${getSyncStatus().message ?? "unknown error"}`
                );
              }}
              disabled={sync.state === "syncing"}
            >
              Sync now
            </button>
            <button
              className="btn-danger grow"
              onClick={async () => {
                await signOut();
                toast.show("Signed out");
              }}
            >
              Log out
            </button>
          </div>
          <div className="faint tiny mt">
            Your data is stored per-account in Supabase (row-level security). This device keeps a
            local synced copy that works offline.
          </div>
        </div>
      )}

      {/* Preferences */}
      <div className="card">
        <h3 className="mb">Units</h3>
        <div className="row" style={{ gap: 8 }}>
          {(["lb", "kg"] as Unit[]).map((u) => (
            <button
              key={u}
              className={settings.unit === u ? "btn-primary grow" : "grow"}
              onClick={() => patch({ unit: u })}
            >
              {u}
            </button>
          ))}
        </div>

        <div className="row between mt-lg">
          <div>
            <div>Rest timer auto-start</div>
            <div className="faint tiny">Start the countdown after each working set</div>
          </div>
          <button
            className={settings.restTimerAutoStart ? "btn-primary" : ""}
            onClick={() => patch({ restTimerAutoStart: !settings.restTimerAutoStart })}
          >
            {settings.restTimerAutoStart ? "On" : "Off"}
          </button>
        </div>

        <hr className="sep" />
        <div className="row between">
          <label className="field grow" style={{ marginRight: 10 }}>
            Upper / isolation jump ({settings.unit})
            <input
              inputMode="decimal"
              defaultValue={settings.weightIncrementUpper}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) patch({ weightIncrementUpper: v });
                else e.target.value = String(settings.weightIncrementUpper);
              }}
            />
          </label>
          <label className="field grow">
            Lower compound jump ({settings.unit})
            <input
              inputMode="decimal"
              defaultValue={settings.weightIncrementLower}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) patch({ weightIncrementLower: v });
                else e.target.value = String(settings.weightIncrementLower);
              }}
            />
          </label>
        </div>
        <div className="faint tiny mt">Used by the progression engine for "add weight" suggestions.</div>
      </div>

      {/* AI coach */}
      <div className="card">
        <div className="row between">
          <h3>AI coach provider</h3>
          <Pill tone="accent">{settings.coachProvider}</Pill>
        </div>
        <div className="faint tiny mt">
          Available: {availableProviders().join(", ")}. Only the mock provider runs locally. Real
          LLMs must be routed through a backend — no API keys in this app.
        </div>
      </div>

      {/* Body metrics */}
      <div className="card">
        <h3 className="mb">Body metrics</h3>
        <div className="row" style={{ gap: 8 }}>
          <label className="field grow">
            Bodyweight ({settings.unit})
            <input inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} />
          </label>
          <label className="field grow">
            Waist (optional)
            <input inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} />
          </label>
        </div>
        <button className="btn-primary btn-block mt" onClick={saveBodyMetric}>
          Log for today
        </button>

        {metrics.length > 0 && (
          <div className="mt">
            {metrics.slice(0, 6).map((m) => (
              <div key={m.id} className="list-row">
                <div>
                  <span>
                    {m.bodyweight != null ? `${fmtNum(m.bodyweight)} ${settings.unit}` : "—"}
                    {m.waist != null ? ` · waist ${fmtNum(m.waist)}` : ""}
                  </span>
                  <div className="faint tiny">{relativeDay(m.date)}</div>
                </div>
                <button
                  className="btn-ghost btn-sm"
                  style={{ color: "var(--text-faint)" }}
                  onClick={() => deleteBodyMetric(m.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backup */}
      <div className="card">
        <h3 className="mb">Backup</h3>
        <p className="small muted" style={{ marginTop: 0 }}>
          Export all local data to a JSON file, or restore from one.
        </p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn-primary grow" onClick={onExport}>
            Export JSON
          </button>
          <button className="grow" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
          }}
        />
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: "var(--border)" }}>
        <h3 className="mb">Data</h3>
        <button className="btn-block mb" onClick={restoreSeed}>
          Refresh program data
        </button>
        <button className="btn-danger btn-block" onClick={eraseAll}>
          Erase all data
        </button>
      </div>

      <div className="faint tiny center mt-lg">Personal Gym Tracker · MVP · v0.1.0</div>
    </div>
  );
}
