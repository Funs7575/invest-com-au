import { createClient } from '@supabase/supabase-js'

/**
 * Cookie-free Supabase client for use in generateStaticParams and other
 * build-time contexts where cookies() is not available.
 * Uses the public anon key — safe for read-only queries (slug lists, etc.).
 */
export function createStaticClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
  }
  return createClient(url, anonKey);
}
