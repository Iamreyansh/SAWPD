import { MarketingHeader } from "@/components/landing/marketing-header";
import { Hero } from "@/components/landing/hero";
import { LogoWall } from "@/components/landing/logo-wall";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturedShops } from "@/components/landing/featured-shops";
import { WhatWeVerify } from "@/components/landing/what-we-verify";
import { Testimonials } from "@/components/landing/testimonials";
import { ComparisonTable } from "@/components/landing/comparison-table";
import { Pricing } from "@/components/landing/pricing";
import { TrustStrip } from "@/components/landing/trust-strip";
import { Founder } from "@/components/landing/founder";
import { FAQ } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export default function MarketingPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
        <LogoWall />
        <HowItWorks />
        <FeaturedShops />
        <WhatWeVerify />
        <Testimonials />
        <ComparisonTable />
        <Pricing />
        <TrustStrip />
        <Founder />
        <FAQ />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
