import type { Metadata } from "next";
import { ContactSection } from "@/components/sections/contact-section";
import { NextPage } from "@/components/ui/next-page";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with GREAT VAL about web projects, brand growth, media production, or collaboration.",
};

export default function ContactPage() {
  return (
    <PageShell>
      <ContactSection page />
      <NextPage current="/contact" />
    </PageShell>
  );
}
