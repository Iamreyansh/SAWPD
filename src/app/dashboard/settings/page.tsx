import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getFirstStore } from "@/lib/store";
import { getTrialState } from "@/lib/trial";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { PlanPicker } from "@/components/dashboard/plan-picker";
import { ReturnsPolicyForm } from "@/components/dashboard/returns-policy-form";
import { DEFAULT_RETURNS_POLICY } from "@/types/storefront";
import type { SellerStore } from "@/types/seller";

export const metadata = { title: "Dashboard · Settings" };
export const dynamic = "force-dynamic";

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function SettingsPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const store = (await getFirstStore()) as SellerStore | null;
  if (!store) redirect("/dashboard");

  const trial = getTrialState(store);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="eyebrow mb-2">Settings</p>
        <h1 className="display-m text-ink">Shop settings</h1>
      </header>

      <section className="rounded-2xl border border-ink/10 bg-bone p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow-ink">Current plan</p>
            <p className="mt-2 text-[18px] font-semibold capitalize tracking-[-0.01em] text-ink">
              {trial.planLabel}
            </p>
            {trial.daysLeft !== null && (
              <p className="mt-1 text-[13px] text-ink/55">
                {trial.daysLeft > 0
                  ? `${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} remaining`
                  : "Trial ended"}
              </p>
            )}
            {trial.reason === "paid" && store.trialEndsAt && (
              <p className="mt-1 text-[12px] text-ink/45">
                Renews on {formatDate(store.trialEndsAt)}
              </p>
            )}
          </div>
          <Link
            href="/#pricing"
            className="inline-flex h-10 items-center justify-center rounded-full border border-ink/15 bg-bone px-5 text-[13px] font-semibold text-ink transition-all hover:bg-ink/[0.04] active:scale-[0.98]"
          >
            {trial.reason === "paid" ? "Compare plans" : "See pricing"}
          </Link>
        </div>
      </section>

      <PlanPicker
        storeSlug={store.slug}
        currentPlan={store.plan ?? null}
      />

      <SettingsForm store={store} />

      <ReturnsPolicyForm
        storeSlug={store.slug}
        policy={store.returnsPolicy ?? DEFAULT_RETURNS_POLICY}
      />
    </div>
  );
}
