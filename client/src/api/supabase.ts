import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public, frontend-safe credentials (publishable/anon key). Row-Level Security
// on Supabase restricts these to INSERT-only — no data can be read from the
// browser. Reading happens in the Supabase Table Editor / an admin backend.
export const SUPABASE_URL: string =
  (typeof window !== 'undefined' && (window as any).SUPABASE_URL) ||
  'https://kfpjlesdojaslvrmeikt.supabase.co';
export const SUPABASE_KEY: string =
  (typeof window !== 'undefined' && (window as any).SUPABASE_KEY) ||
  'sb_publishable_BNsHrXghbwLIPyf3mTTi2A_eLdiVVpn';
const URL = SUPABASE_URL;
const KEY = SUPABASE_KEY;

export const supabase: SupabaseClient | null =
  URL && KEY
    ? createClient(URL, KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      })
    : null;

/** Fire-and-forget insert; never throws into the UI. */
export async function saveRow(table: string, row: Record<string, unknown>) {
  if (!supabase) return { ok: false };
  try {
    const { error } = await supabase.from(table).insert(row);
    return { ok: !error, error };
  } catch (e) {
    return { ok: false, error: e };
  }
}
