import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public Supabase client values only. The anon key is designed to be exposed in
// the frontend — Row Level Security (user_id = auth.uid()) is the real boundary.
// NEVER put the service_role key here.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When env vars are absent the app runs in pure local-only mode (no auth, no
// sync) — exactly the original behavior — so it still builds and runs anywhere.
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true, // session survives refresh (stored in localStorage)
        autoRefreshToken: true,
        storageKey: "gym-tracker-auth",
      },
    })
  : null;
