import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope } from "next/font/google";
import { Providers } from "./providers";
import {
  getMetaPixelId,
  getGa4MeasurementId,
  getGoogleAdsId,
} from "@/lib/pixels";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://sawpd.com",
  ),
  title: {
    default: "SAWPD — The shop in your bio",
    template: "%s · SAWPD",
  },
  description: "Turn your DMs into orders. Built for Instagram creators.",
  applicationName: "SAWPD",
  keywords: [
    "Instagram shop",
    "UPI payments",
    "India creators",
    "online shop link in bio",
    "checkout for creators",
  ],
  authors: [{ name: "SAWPD" }],
  creator: "SAWPD",
  openGraph: {
    type: "website",
    siteName: "SAWPD",
    title: "SAWPD — The shop in your bio",
    description: "Turn your DMs into orders. Built for Instagram creators.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SAWPD — The shop in your bio",
    description: "Turn your DMs into orders. Built for Instagram creators.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F5F2EC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const metaPixelId = getMetaPixelId();
  const ga4Id = getGa4MeasurementId();
  const googleAdsId = getGoogleAdsId();

  return (
    <html lang="en" className={manrope.variable}>
      <head>
        {/*
          Pixel scripts render conditionally. If env vars are missing,
          we skip loading anything — every helper is then a no-op so the
          app still works. Production deployments should set:
            NEXT_PUBLIC_META_PIXEL_ID
            NEXT_PUBLIC_GA4_MEASUREMENT_ID
            NEXT_PUBLIC_GOOGLE_ADS_ID
        */}
        {metaPixelId && (
          <>
            <Script id="fb-pixel-base" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${metaPixelId}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}

        {/* GA4 + Google Ads share a single gtag.js install. */}
        {/*
          Configure both AW-... and G-... IDs in a single `config` call
          when present so GA4 picks up Google Ads auto-tagging.
        */}
        {(ga4Id || googleAdsId) && (
          <Script id="gtag-base" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${ga4Id ? `gtag('config', '${ga4Id}');` : ""}
              ${
                googleAdsId
                  ? `gtag('config', '${googleAdsId}');`
                  : ""
              }
            `}
          </Script>
        )}
        {ga4Id && (
          <Script
            id="gtag-js"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
