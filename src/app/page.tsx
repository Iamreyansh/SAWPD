import { MarketingHeader } from "@/components/landing/marketing-header";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturedShops } from "@/components/landing/featured-shops";
import { WhatWeVerify } from "@/components/landing/what-we-verify";
import { Testimonials } from "@/components/landing/testimonials";
import { ComparisonTable } from "@/components/landing/comparison-table";
import { Pricing } from "@/components/landing/pricing";
import { TrustStrip } from "@/components/landing/trust-strip";
import { FAQ } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { getCurrentSeller } from "@/lib/seller-auth";

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
