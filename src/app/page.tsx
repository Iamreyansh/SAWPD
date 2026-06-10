import dynamic from "next/dynamic";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { getCurrentSeller } from "@/lib/seller-auth";

function SectionSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <div className="h-4 w-24 animate-pulse rounded bg-ink/[0.06]" />
      <div className="mt-4 h-8 w-64 animate-pulse rounded bg-ink/[0.04]" />
      <div className="mt-3 h-4 w-96 animate-pulse rounded bg-ink/[0.04]" />
    </div>
  );
}

const FeaturedShops = dynamic(() => import("@/components/landing/featured-shops").then(m => ({ default: m.FeaturedShops })), { loading: SectionSkeleton });
const WhatWeVerify = dynamic(() => import("@/components/landing/what-we-verify").then(m => ({ default: m.WhatWeVerify })), { loading: SectionSkeleton });
const Testimonials = dynamic(() => import("@/components/landing/testimonials").then(m => ({ default: m.Testimonials })), { loading: SectionSkeleton });
const ComparisonTable = dynamic(() => import("@/components/landing/comparison-table").then(m => ({ default: m.ComparisonTable })), { loading: SectionSkeleton });
const Pricing = dynamic(() => import("@/components/landing/pricing").then(m => ({ default: m.Pricing })), { loading: SectionSkeleton });
const TrustStrip = dynamic(() => import("@/components/landing/trust-strip").then(m => ({ default: m.TrustStrip })), { loading: SectionSkeleton });
const FAQ = dynamic(() => import("@/components/landing/faq").then(m => ({ default: m.FAQ })), { loading: SectionSkeleton });
const FinalCta = dynamic(() => import("@/components/landing/final-cta").then(m => ({ default: m.FinalCta })), { loading: SectionSkeleton });

export default async function MarketingPage() {
  const seller = await getCurrentSeller();
  return (
    <>
      <MarketingHeader seller={seller ? { email: seller.email } : null} />
      <main>
        <Hero />
        <HowItWorks />
        <FeaturedShops />
        <WhatWeVerify />
        <Testimonials />
        <ComparisonTable />
        <Pricing />
        <TrustStrip />
        <FAQ />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
