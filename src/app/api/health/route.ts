import { NextResponse } from "next/server";

export async function GET() {
  const vars = [
    "SELLER_SECRET",
    "ADMIN_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NOTIFY_EMAIL",
  ];
  const status: Record<string, string> = {};
  for (const name of vars) {
    const val = process.env[name];
    if (!val) {
      status[name] = "MISSING";
    } else if (val.length < 8) {
      status[name] = `TOO_SHORT (${val.length} chars)`;
    } else {
      status[name] = "OK";
    }
  }
  return NextResponse.json(status);
}
