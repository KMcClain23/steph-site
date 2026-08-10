import type { Metadata } from "next";
import { Epilogue, Nunito_Sans } from "next/font/google";
import { SITE } from "@/lib/content";
import "./globals.css";

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-epilogue",
  display: "swap",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.narrator} | ${SITE.name}`,
    template: `%s | ${SITE.name}`,
  },
  description:
    "Stephanie Betschart is an audiobook narrator for thrillers, romance, mystery, and fantasy — also credited as Ann Dahlia for explicit and horror titles.",
  keywords: [
    "audiobook narrator",
    "Stephanie Betschart",
    "Ann Dahlia",
    "romance narrator",
    "fantasy narrator",
    "Depth & Dawn Audio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.narrator} | ${SITE.name}`,
    description: SITE.tagline,
    url: SITE.url,
    images: [{ url: "/hero.webp", width: 1599, height: 729, alt: SITE.narrator }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.narrator} | ${SITE.name}`,
    description: SITE.tagline,
    images: ["/hero.webp"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${epilogue.variable} ${nunito.variable}`}>
      <body>
        <div className="site-bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
