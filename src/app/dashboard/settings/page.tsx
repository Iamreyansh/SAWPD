import Link from "next/link";
import { requireActiveStore } from "@/lib/seller-auth";
import { getTrialState } from "@/lib/trial";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { PlanPicker } from "@/components/dashboard/plan-picker";
import { ReturnsPolicyForm } from "@/components/dashboard/returns-policy-form";
import { FeatureToggles } from "@/components/dashboard/feature-toggles";
import { ThemePicker } from "@/components/dashboard/theme-picker";
import { isThemeId, DEFAULT_THEME } from "@/lib/themes";
import { DEFAULT_RETURNS_POLICY } from "@/types/storefront";

export const metadata = {
  title: "Dashboard · Settings",
  description: "Shop settings: profile, UPI, hero, returns policy, plan.",
  robots: { index: false, follow: false },
};
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
  const store = await requireActiveStore();
  if (!store) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-ink/15 p-12 text-center">
        <h1 className="display-m text-ink">No shop selected.</h1>
        <p className="mt-3 text-[14px] text-ink/65">
          Apply for a shop to start selling.
        </p>
        <Link
          href="/apply"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-vermillion px-5 text-[12.5px] font-semibold text-bone hover:bg-vermillion-deep"
        >
          Apply now →
        </Link>
      </div>
    );
  }

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

      <div>
        <p className="eyebrow mb-4 mt-12">Appearance</p>
        <ThemePicker
          storeSlug={store.slug}
          currentThemeId={
            isThemeId(store.themeId) ? store.themeId : DEFAULT_THEME
          }
          currentOverrides={store.themeOverrides ?? null}
        />
      </div>

      <ReturnsPolicyForm
        storeSlug={store.slug}
        policy={store.returnsPolicy ?? DEFAULT_RETURNS_POLICY}
      />

      <div>
        <p className="eyebrow mb-4 mt-12">Features</p>
        <FeatureToggles
          storeSlug={store.slug}
          enabled={store.customOrdersEnabled ?? false}
        />
        <div className="mt-4">
          <FeatureToggles
            storeSlug={store.slug}
            enabled={store.servicesEnabled ?? false}
            featureKey="servicesEnabled"
            title="Service bookings"
            description="Turn your shop into a bookable service — massages, cleanings, consultations, anything that runs on appointments instead of shipping. Mark a product as a Service in /dashboard/products to start taking bookings."
          />
        </div>
      </div>
    </div>
  );
}
