import type { Metadata } from "next";
import { FeaturedSection } from "@/components/sections/featured-section";
import { NextPage } from "@/components/ui/next-page";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Featured",
  description:
    "The book No Capital, No Noise, the podcast One Brick at a Time, and match commentary.",
};

export default function FeaturedPage() {
  return (
    <PageShell>
      <FeaturedSection page />
      <NextPage current="/featured" />
    </PageShell>
  );
}
