import { useState } from "react";
import { useAuth } from "./AuthProvider";

// Login / signup screen shown when Supabase is configured and no session exists.
export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res =
        mode === "login" ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
      if (res.error) {
        setError(res.error);
      } else if (res.needsConfirmation) {
        setInfo("Check your email to confirm your account, then sign in.");
        setMode("login");
      }
      // On success the auth listener swaps this screen for the app.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="screen" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="center" style={{ marginBottom: 18 }}>
          <img src="/icons/icon.svg" alt="" width={64} height={64} style={{ borderRadius: 16 }} />
          <h1 style={{ marginTop: 12 }}>Gym Tracker</h1>
          <div className="muted small">
            {mode === "login" ? "Sign in to sync your workouts" : "Create an account to sync across devices"}
          </div>
        </div>

        <form className="card" onSubmit={submit}>
          <label className="field">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="field mt">
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="pill red mt" style={{ display: "block", padding: "8px 12px" }}>
              {error}
            </div>
          )}
          {info && (
            <div className="pill green mt" style={{ display: "block", padding: "8px 12px" }}>
              {info}
            </div>
          )}

          <button className="btn-primary btn-block btn-lg mt-lg" disabled={busy} type="submit">
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          className="btn-ghost btn-block mt"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"));
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>

        <div className="faint tiny center mt-lg">
          Your data is protected per-account with row-level security.
        </div>
      </div>
    </div>
  );
}
