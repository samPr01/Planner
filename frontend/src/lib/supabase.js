// Supabase client — optional. If env vars are missing, exports null and the app runs local-only.
import { createClient } from "@supabase/supabase-js";

// Trim to guard against trailing whitespace/newlines that sneak in when values
// are copied into hosting dashboards (Netlify, Vercel).
const url = (process.env.REACT_APP_SUPABASE_URL || "").trim();
const anon = (process.env.REACT_APP_SUPABASE_ANON_KEY || "").trim();

// Both must be present AND non-empty. Empty strings should NOT enable the client.
export const cloudEnabled = !!(url && anon && url.length > 8 && anon.length > 20);

export const supabase = cloudEnabled
    ? createClient(url, anon, {
          auth: {
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: true,
              flowType: "pkce", // required for reliable OAuth on SPAs
              storageKey: "ledger.auth.session",
          },
          global: {
              // Redundantly attach apikey so every REST/Auth call carries it
              // even if the SDK ever drops it (defensive belt-and-braces).
              headers: { apikey: anon },
          },
      })
    : null;

// Boot-time diagnostic — visible in production consoles so the user can
// verify env vars actually baked into the build. Never logs the secret.
if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.info(
        "[Ledger] Cloud sync:",
        cloudEnabled ? "ENABLED" : "DISABLED",
        `| url=${url ? url.replace(/^https?:\/\//, "").split(".")[0] : "missing"}`,
        `| key=${anon ? `set (${anon.length} chars, prefix=${anon.slice(0, 3)}…)` : "missing"}`
    );
    // Expose a debug helper. Call `window.__ledgerDebug()` from DevTools.
    window.__ledgerDebug = () => ({
        cloudEnabled,
        hasUrl: !!url,
        hasKey: !!anon,
        keyPrefix: anon ? anon.slice(0, 8) : null,
        keyLength: anon.length,
        supabaseInitialized: !!supabase,
    });
}
