import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import AuthScreen from "./AuthScreen";
import { startSync } from "../sync/supabaseSync";

// Decides what to render based on auth state:
//   - Supabase not configured  -> render the app (original local-only mode).
//   - configured, still loading -> splash.
//   - configured, no session    -> AuthScreen (protects all app routes).
//   - configured, signed in      -> start per-user sync, render the app.
export default function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, session, user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (configured && userId) void startSync(userId);
  }, [configured, userId]);

  if (!configured) return <>{children}</>;

  if (loading) {
    return (
      <div className="app">
        <div className="screen center" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="muted">Loading…</span>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return <>{children}</>;
}
