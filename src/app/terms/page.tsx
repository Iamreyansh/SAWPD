import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Terms of Service — SAWPD",
  description: "The rules and guidelines for using SAWPD.",
};

export default function TermsPage() {
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
          <h1 className="display-l text-ink text-balance">Terms of Service</h1>
          <p className="mt-4 text-[13.5px] text-ink/50">Last updated: June 2026</p>

          <div className="mt-10 space-y-8 text-[15px] leading-[1.7] text-ink/70">
            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">1. Acceptance</h2>
              <p>
                By using SAWPD, you agree to these terms. If you don&apos;t agree, please don&apos;t use the platform.
                We may update these terms from time to time — continued use means you accept the changes.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">2. What SAWPD is</h2>
              <p>
                SAWPD is a storefront platform for Instagram creators. We give you a shop link, an order
                dashboard, and a product catalog. You handle the products, the pricing, the shipping, and
                the customer relationships. We just provide the infrastructure.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">3. Your responsibilities</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must be a real creator selling real products.</li>
                <li>You are responsible for fulfilling orders, shipping on time, and handling customer disputes.</li>
                <li>You must not use SAWPD to sell counterfeit, illegal, or harmful products.</li>
                <li>You are responsible for your own tax compliance.</li>
                <li>You must not misrepresent your products with stolen or misleading photos.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">4. Payments and subscriptions</h2>
              <p>
                SAWPD charges a flat subscription fee (weekly or monthly). We do not take a commission on
                your sales. You keep 100% of every sale. Subscriptions can be cancelled at any time from
                your dashboard.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">5. Order disputes</h2>
              <p>
                SAWPD is not a party to transactions between you and your customers. We do not mediate
                refunds or disputes. You are directly responsible for resolving any issues with your buyers.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">6. Account termination</h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms, engage in
                fraud, or harm other users. We will give you notice before termination except in cases of
                serious abuse.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">7. Limitation of liability</h2>
              <p>
                SAWPD is provided as-is. We are not liable for any losses arising from your use of the
                platform, including lost revenue, data loss, or business interruption. Our total liability
                does not exceed the subscription fees you paid in the last 3 months.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-ink">8. Contact</h2>
              <p>
                Questions? Reach us at{" "}
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
