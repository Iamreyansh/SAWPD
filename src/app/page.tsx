import dynamic from "next/dynamic";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { getCurrentSeller } from "@/lib/seller-auth";

const FeaturedShops = dynamic(() => import("@/components/landing/featured-shops").then(m => ({ default: m.FeaturedShops })), { loading: () => null });
const WhatWeVerify = dynamic(() => import("@/components/landing/what-we-verify").then(m => ({ default: m.WhatWeVerify })), { loading: () => null });
const Testimonials = dynamic(() => import("@/components/landing/testimonials").then(m => ({ default: m.Testimonials })), { loading: () => null });
const ComparisonTable = dynamic(() => import("@/components/landing/comparison-table").then(m => ({ default: m.ComparisonTable })), { loading: () => null });
const Pricing = dynamic(() => import("@/components/landing/pricing").then(m => ({ default: m.Pricing })), { loading: () => null });
const TrustStrip = dynamic(() => import("@/components/landing/trust-strip").then(m => ({ default: m.TrustStrip })), { loading: () => null });
const FAQ = dynamic(() => import("@/components/landing/faq").then(m => ({ default: m.FAQ })), { loading: () => null });
const FinalCta = dynamic(() => import("@/components/landing/final-cta").then(m => ({ default: m.FinalCta })), { loading: () => null });

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
