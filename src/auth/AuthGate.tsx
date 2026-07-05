import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import AuthScreen from "./AuthScreen";
import { startSync } from "../sync/supabaseSync";
import ScreenSkeleton from "../components/Skeleton";

// Shown when the user lands from a password-recovery email link.
function SetNewPassword() {
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await updatePassword(pw);
      if (res.error) setError(res.error);
      // Success clears the recovery flag in the provider and the app renders.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="screen" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <form className="card" onSubmit={submit}>
          <h2>Set a new password</h2>
          <p className="small muted">You followed a password-reset link — choose a new password.</p>
          <label className="field mt">
            New password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </label>
          {error && (
            <div className="pill red mt" style={{ display: "block", padding: "8px 12px" }}>
              {error}
            </div>
          )}
          <button className="btn-primary btn-block btn-lg mt-lg" disabled={busy} type="submit">
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Decides what to render based on auth state:
//   - Supabase not configured  -> render the app (original local-only mode).
//   - configured, still loading -> splash.
//   - configured, no session    -> AuthScreen (protects all app routes).
//   - configured, signed in      -> start per-user sync, render the app.
export default function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, session, user, passwordRecovery } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (configured && userId) void startSync(userId);
  }, [configured, userId]);

  if (!configured) return <>{children}</>;

  if (loading) {
    return (
      <div className="app">
        <ScreenSkeleton />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (passwordRecovery) return <SetNewPassword />;

  return <>{children}</>;
}
