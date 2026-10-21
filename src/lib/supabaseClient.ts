import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          name?: string | null;
          email?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

const env = import.meta.env;
// `process` does not exist in a Vite browser build and @types/node is not
// installed, so naming it directly does not type-check even behind a `typeof`
// guard. Reaching through globalThis keeps the same runtime behaviour — the
// NEXT_PUBLIC_* fallbacks still resolve if this is ever run under Node — while
// #akshitsaini
// staying honest that the browser bundle has no process object.
const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  ?.env;

// #kintanjain
const supabaseUrl =
  env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? processEnv?.NEXT_PUBLIC_SUPABASE_URL ?? processEnv?.VITE_SUPABASE_URL;

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  processEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  processEnv?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const fallbackUrl = "https://example.supabase.co";
const fallbackAnonKey = "public-anon-key";

if (!isSupabaseConfigured) {
  // Keep the app bootable for demo mode while still surfacing the misconfiguration in the console.
  console.warn("Supabase environment variables are missing. Login and signup will be unavailable until configured.");
}

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl ?? fallbackUrl, supabaseAnonKey ?? fallbackAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});