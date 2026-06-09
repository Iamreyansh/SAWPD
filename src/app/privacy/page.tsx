import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Privacy Policy — SAWPD",
  description: "How SAWPD collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bone">
      <header className="border-b border-ink/[0.06] bg-bone/95 backdrop-blur-md">
        <div className="container-editorial flex h-16 items-center justify-between">
          <Logo invert />
          <Link
            href="/"
            className="text-[13.5px] font-semibold text-ink/65 transition-colors hover:text-ink"
          >
            ← Back to home
          </Link>
        </div>
      </header>
      <main className="container-editorial py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow mb-3">Legal</p>
          <h1 className="display-l text-ink text-balance">Privacy Policy</h1>
          <p className="mt-4 text-[13.5px] text-ink/50">Last updated: June 2026</p>

          <div className="mt-10 space-y-8 text-[15px] leading-[1.7] text-ink/70">
            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">1. What we collect</h2>
              <p>
                When you use SAWPD as a seller, we collect your email address, password (hashed with bcrypt),
                Instagram handle, shop name, phone number, and UPI ID. When you use SAWPD as a customer, we
                collect your name, phone number, email (optional), and delivery address.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">2. How we use it</h2>
              <p>
                We use your information to operate your shop, process orders, send you order notifications,
                and improve SAWPD. We do not sell your personal data to third parties. We do not run ads.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">3. Payments</h2>
              <p>
                SAWPD does not process payments. All transactions happen directly between the customer and
                the seller via UPI. We never see, store, or touch your bank details or UPI screenshots.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">4. Data storage</h2>
              <p>
                Your data is stored securely on Supabase (PostgreSQL) with row-level security policies.
                Files you upload (product images) are stored in Supabase Storage. We retain your data as
                long as your account is active.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">5. Your rights</h2>
              <p>
                You can request deletion of your account and all associated data at any time by contacting
                us. You can also export your data from the dashboard.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">6. Cookies</h2>
              <p>
                SAWPD uses session cookies to keep you logged in. These are httpOnly, secure, same-site
                cookies that expire after 30 days. We do not use tracking cookies or third-party analytics.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">7. Changes</h2>
              <p>
                We may update this policy from time to time. We will notify you of significant changes
                via email or a notice on the dashboard.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">8. Contact</h2>
              <p>
                Questions about this policy? Reach us at{" "}
                <a href="mailto:hello@sawpd.com" className="font-semibold text-vermillion hover:underline">
                  hello@sawpd.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
