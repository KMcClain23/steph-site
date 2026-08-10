import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Me",
  description:
    "Booking, collaboration, or audiobook narration inquiries for Stephanie Betschart / Ann Dahlia.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 py-10 md:px-9">
      <ContactForm />
    </div>
  );
}
