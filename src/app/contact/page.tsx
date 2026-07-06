import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Contact",
  description: "Get in touch with the SAWPD team.",
};

export default function ContactPage() {
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
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow mb-3">Get in touch</p>
          <h1 className="display-l text-ink text-balance">
            Contact us. <span className="text-ink/30">We reply fast.</span>
          </h1>
          <p className="mt-4 text-[15px] text-ink/60">
            Whether you&apos;re a creator with a question, a seller with a problem, or just curious
            about SAWPD — we&apos;d love to hear from you.
          </p>

          <div className="mt-12 space-y-6">
            <a
              href="mailto:hello@sawpd.com"
              className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-bone p-6 transition-all hover:border-ink/25 hover:shadow-[0_4px_18px_-2px_rgba(17,17,17,0.08)]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-vermillion/10 text-vermillion">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-semibold text-ink">hello@sawpd.com</p>
                <p className="mt-0.5 text-[13.5px] text-ink/55">For general questions and support</p>
              </div>
            </a>

            <a
              href="https://instagram.com/sawpd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-bone p-6 transition-all hover:border-ink/25 hover:shadow-[0_4px_18px_-2px_rgba(17,17,17,0.08)]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-vermillion/10 text-vermillion">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-semibold text-ink">@sawpd on Instagram</p>
                <p className="mt-0.5 text-[13.5px] text-ink/55">DM us for quick replies</p>
              </div>
            </a>

            <a
              href="https://twitter.com/sawpd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-bone p-6 transition-all hover:border-ink/25 hover:shadow-[0_4px_18px_-2px_rgba(17,17,17,0.08)]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-vermillion/10 text-vermillion">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-semibold text-ink">@sawpd on X</p>
                <p className="mt-0.5 text-[13.5px] text-ink/55">Follow for updates and launches</p>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
