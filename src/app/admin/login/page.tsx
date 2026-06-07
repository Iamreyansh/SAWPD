import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Admin · Login" };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-bone px-5">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-ink/50 transition-colors hover:text-ink"
        >
          ← SAWPD
        </Link>
        <p className="eyebrow mb-3">Admin</p>
        <h1 className="display-m text-ink text-balance">
          Sign in.
        </h1>
        <p className="mt-3 text-[14px] text-ink/60">
          Enter the admin password to continue.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
