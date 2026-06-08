import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseUrl,
  getSupabaseServiceRoleKey,
} from "@/lib/env";

export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
