import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { contactPageJsonLd } from "@/lib/structured-data";

const DESCRIPTION =
  "Book audiobook narrator Stephanie Betschart — romance, fantasy, thriller, and mystery, or explicit and horror as Ann Dahlia. Send a project inquiry and hear back directly.";

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Stephanie Betschart",
    description: DESCRIPTION,
    url: "/contact",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 py-10 md:px-9">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd()) }}
      />
      <ContactForm />
    </div>
  );
}
