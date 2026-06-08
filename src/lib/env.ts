/**
 * Runtime validation for required environment variables.
 * Throws a clear error on startup if any are missing.
 */

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `Missing required env var: ${name}. Add it to .env.local and restart the dev server.`
    );
  }
  return val;
}

export function getSupabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
