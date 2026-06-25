import { useEffect, useState } from "react";
import { subscribeSync, getSyncStatus, type SyncStatus } from "./supabaseSync";

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  useEffect(() => subscribeSync(setStatus), []);
  return status;
}
