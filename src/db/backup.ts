import { db, BACKUP_TABLES, type BackupTableName } from "./db";

const BACKUP_VERSION = 1;
const BACKUP_MAGIC = "personal-gym-tracker";

export interface BackupFile {
  magic: string;
  version: number;
  exportedAt: string;
  data: Record<BackupTableName, unknown[]>;
}

// Serialize the entire local database into a single JSON object.
export async function exportBackup(): Promise<BackupFile> {
  const data = {} as Record<BackupTableName, unknown[]>;
  await db.transaction("r", db.tables, async () => {
    for (const name of BACKUP_TABLES) {
      data[name] = await db.table(name).toArray();
    }
  });
  return {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

// Trigger a browser download of the backup JSON.
export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `gym-tracker-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  ok: boolean;
  message: string;
  counts?: Record<string, number>;
}

// Validate then restore a backup. `replace` clears existing data first;
// otherwise it merges (upsert by primary key). Everything happens in one
// transaction so a malformed file can't leave the DB half-written.
export async function importBackup(json: unknown, replace = true): Promise<ImportResult> {
  const parsed = json as Partial<BackupFile>;
  if (!parsed || parsed.magic !== BACKUP_MAGIC || typeof parsed.data !== "object") {
    return { ok: false, message: "Not a valid Gym Tracker backup file." };
  }
  if (typeof parsed.version !== "number" || parsed.version > BACKUP_VERSION) {
    return { ok: false, message: `Unsupported backup version (${parsed.version}).` };
  }

  const data = parsed.data as Record<string, unknown[]>;
  // Only accept known tables; ignore any extras defensively.
  const tablesToWrite = BACKUP_TABLES.filter(
    (name) => Array.isArray(data[name])
  ) as BackupTableName[];

  const counts: Record<string, number> = {};
  try {
    await db.transaction("rw", db.tables, async () => {
      for (const name of tablesToWrite) {
        const rows = data[name] as unknown[];
        const table = db.table(name);
        if (replace) await table.clear();
        if (rows.length) await table.bulkPut(rows as never[]);
        counts[name] = rows.length;
      }
    });
  } catch (err) {
    return { ok: false, message: `Import failed: ${(err as Error).message}` };
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    ok: true,
    message: `Restored ${total} records across ${tablesToWrite.length} tables.`,
    counts,
  };
}

// Read + parse a File chosen from an <input type="file">.
export async function readBackupFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}
