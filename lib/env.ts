/**
 * Runtime environment variable validation.
 * Import this module early (e.g. in middleware or layout) so missing vars
 * cause a clear error at startup rather than a cryptic crash at runtime.
 */

/* ---------- helpers ---------- */
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `[env] Missing required environment variable: ${key}. ` +
        `Add it to .env.local or your hosting provider's environment settings.`
    );
  }
  return val;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/* ---------- public (safe to expose to the browser) ---------- */
export const NEXT_PUBLIC_SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = requireEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
);
export const NEXT_PUBLIC_SITE_URL = optionalEnv(
  "NEXT_PUBLIC_SITE_URL",
  "https://invest.com.au"
);

/* ---------- server-only ---------- */
// These are only evaluated when the module is imported on the server.
// Next.js tree-shakes them out of client bundles automatically.
export const server = {
  get SUPABASE_SERVICE_ROLE_KEY() {
    return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get STRIPE_SECRET_KEY() {
    return requireEnv("STRIPE_SECRET_KEY");
  },
  get STRIPE_WEBHOOK_SECRET() {
    return requireEnv("STRIPE_WEBHOOK_SECRET");
  },
  get IP_HASH_SALT() {
    return requireEnv("IP_HASH_SALT");
  },
  get RESEND_API_KEY() {
    return process.env.RESEND_API_KEY || "";
  },
  get GA_MEASUREMENT_ID() {
    return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
  },
};
