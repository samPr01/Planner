// Supabase client — optional. If env vars are missing, exports null and the app runs local-only.
import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const cloudEnabled = !!(url && anon);

export const supabase = cloudEnabled
    ? createClient(url, anon, {
          auth: {
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: true,
              storageKey: "ledger.auth.session",
          },
      })
    : null;
