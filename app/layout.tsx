import type { Metadata } from "next";
import { Epilogue, Nunito_Sans } from "next/font/google";
import { IS_CANONICAL_HOST, SITE } from "@/lib/content";
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

// Search results truncate around 60 characters for titles and 155 for
// descriptions, so both are written to say something useful inside that.
// The description leads with what she is and names both credits, because
// "Ann Dahlia" is a term people search for separately.
const DESCRIPTION =
  "Audiobook narrator Stephanie Betschart records romance, fantasy, thrillers, and mystery from a treated ACX-spec home studio — and explicit and horror titles as Ann Dahlia.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Stephanie Betschart — Audiobook Narrator | Ann Dahlia",
    template: `%s | ${SITE.name}`,
  },
  description: DESCRIPTION,
  applicationName: SITE.name,
  authors: [{ name: SITE.narrator, url: SITE.url }],
  creator: SITE.narrator,
  publisher: SITE.legalName,
  keywords: [
    "audiobook narrator",
    "Stephanie Betschart",
    "Ann Dahlia",
    "romance audiobook narrator",
    "fantasy audiobook narrator",
    "thriller narrator",
    "dark romance narrator",
    "female narrator",
    "ACX narrator",
    "Depth & Dawn Audio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    siteName: SITE.name,
    title: "Stephanie Betschart — Audiobook Narrator | Ann Dahlia",
    description: DESCRIPTION,
    url: SITE.url,
    locale: "en_US",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: `${SITE.narrator} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stephanie Betschart — Audiobook Narrator | Ann Dahlia",
    description: DESCRIPTION,
    images: ["/og.jpg"],
  },
  // Must agree with app/robots.ts. A preview deployment serving
  // "Disallow: /" while every page carries index,follow is a mixed signal —
  // robots.txt blocks the crawl, but a linked-to preview URL can still get
  // indexed on the strength of the meta tag alone.
  robots: IS_CANONICAL_HOST
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      }
    : { index: false, follow: false },
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
