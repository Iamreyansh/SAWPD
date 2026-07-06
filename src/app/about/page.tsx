import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "About",
  description: "The story behind SAWPD — why we built it and who it's for.",
};

export default function AboutPage() {
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
          <p className="eyebrow mb-3">About SAWPD</p>
          <h1 className="display-l text-ink text-balance">
            The shop in your bio.
          </h1>

          <div className="mt-10 space-y-8 text-[15.5px] leading-[1.7] text-ink/70">
            <p>
              I watched a friend lose 9 hours a week to DMs. She sold earrings out of her bedroom —
              beautiful, handmade pieces that people loved. But every order was a 12-message thread:
              &quot;What sizes do you have?&quot; &quot;Can I pay via UPI?&quot; &quot;What&apos;s
              your UPI ID?&quot; &quot;Here&apos;s the screenshot.&quot; &quot;What&apos;s your
              address?&quot; &quot;Done, shipped!&quot;
            </p>

            <p>
              She was spending more time on WhatsApp than actually making things. And she wasn&apos;t
              alone. Every Instagram creator I talked to had the same problem.
            </p>

            <p>
              SAWPD is the solution. One link in your bio that takes customers to a clean, fast shop.
              They pick what they want, pay via UPI, and you verify and ship. No DMs. No confusion.
              Just a proper checkout.
            </p>

            <div className="my-8 rounded-2xl border border-ink/10 bg-bone p-8">
              <p className="eyebrow mb-3">How it works</p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-bone">1</span>
                  <div>
                    <p className="font-semibold text-ink">Apply in 5 minutes</p>
                    <p className="mt-0.5 text-[14px] text-ink/60">Tell us about your shop. We review by hand.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-bone">2</span>
                  <div>
                    <p className="font-semibold text-ink">Add your products</p>
                    <p className="mt-0.5 text-[14px] text-ink/60">Photos, prices, descriptions. Takes 10 minutes.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-bone">3</span>
                  <div>
                    <p className="font-semibold text-ink">Share your link</p>
                    <p className="mt-0.5 text-[14px] text-ink/60">Put it in your Instagram bio. Start selling.</p>
                  </div>
                </div>
              </div>
            </div>

            <p>
              We&apos;re based in Bangalore, built by Indians, for Indian creators. Every shop is
              hand-reviewed by a real person. No bots, no algorithms, no gatekeeping — just a
              team that cares about making selling easier.
            </p>

            <p>
              SAWPD is a flat subscription. You keep 100% of every sale. We never touch the money.
              It goes from your customer to your UPI to your bank.
            </p>

            <div className="mt-8">
              <Link
                href="/apply"
                className="inline-flex h-12 items-center justify-center rounded-full bg-vermillion px-8 text-[14px] font-semibold text-bone shadow-glow transition-all hover:bg-vermillion-deep active:scale-[0.98]"
              >
                Apply for access
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
