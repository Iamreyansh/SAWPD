import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseUrl,
  getSupabaseServiceRoleKey,
} from "@/lib/env";

let cached: SupabaseClient | null = null;

export function createAdminClient() {
  if (cached) return cached;
  cached = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
