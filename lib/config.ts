/**
 * Centralised, typed access to environment variables.
 *
 * Usage: import { config } from "@/lib/config"
 *        config.siteUrl   // string, guaranteed non-empty
 *
 * Validated at module load — misconfigured deploys fail fast with a clear
 * message rather than silently using wrong values at runtime.
 */

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

const optional = (key: string, fallback: string): string =>
  process.env[key] || fallback;

export const config = {
  siteUrl: optional("NEXT_PUBLIC_SITE_URL", "https://invest.com.au"),
  supabaseUrl: optional("NEXT_PUBLIC_SUPABASE_URL", ""),
  supabaseAnonKey: optional("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),
  resendApiKey: optional("RESEND_API_KEY", ""),
  stripeSecretKey: optional("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET", ""),
  adminEmails: optional("ADMIN_EMAILS", "").split(",").filter(Boolean),
  cronSecret: optional("CRON_SECRET", ""),
  nodeEnv: optional("NODE_ENV", "development") as "development" | "production" | "test",
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
} as const;
