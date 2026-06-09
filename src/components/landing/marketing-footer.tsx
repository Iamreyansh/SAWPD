import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink/[0.06] bg-bone">
      <div className="container-editorial py-14 md:py-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <Logo invert />
            <p className="mt-4 max-w-xs text-[13.5px] text-ink/55">
              The shop in your bio. For Instagram creators who&apos;d rather
              ship than DM.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
            <div>
              <p className="eyebrow-ink mb-3">Product</p>
              <ul className="space-y-2 text-[13.5px] text-ink/65">
                <li><a href="#how" className="transition-colors hover:text-ink">How it works</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-ink">Pricing</a></li>
                <li><a href="#testimonials" className="transition-colors hover:text-ink">Testimonials</a></li>
                <li><Link href="/shops" className="transition-colors hover:text-ink">Live shops</Link></li>
                <li><Link href="/s/riya" className="transition-colors hover:text-ink">Demo shop</Link></li>
              </ul>
            </div>
            <div>
              <p className="eyebrow-ink mb-3">Company</p>
              <ul className="space-y-2 text-[13.5px] text-ink/65">
                <li><Link href="/about" className="transition-colors hover:text-ink">About</Link></li>
                <li><Link href="/contact" className="transition-colors hover:text-ink">Contact</Link></li>
                <li><Link href="/apply" className="transition-colors hover:text-ink">Apply</Link></li>
                <li><Link href="/seller/login" className="transition-colors hover:text-ink">Log in</Link></li>
              </ul>
            </div>
            <div>
              <p className="eyebrow-ink mb-3">Resources</p>
              <ul className="space-y-2 text-[13.5px] text-ink/65">
                <li><Link href="/track" className="transition-colors hover:text-ink">Track an order</Link></li>
                <li><Link href="/terms" className="transition-colors hover:text-ink">Terms</Link></li>
                <li><Link href="/privacy" className="transition-colors hover:text-ink">Privacy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-ink/[0.06] pt-6 text-[12px] text-ink/40 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} SAWPD. All rights reserved.</p>
          <p>Made for creators, in India.</p>
        </div>
      </div>
    </footer>
  );
}
