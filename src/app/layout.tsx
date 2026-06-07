import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAWPD — The shop in your bio",
  description: "Turn your DMs into orders. Built for Instagram creators.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F5F2EC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
