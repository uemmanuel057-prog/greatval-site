import { HeroSection } from "@/components/sections/hero-section";
import { AboutSection } from "@/components/sections/about-section";
import { PillarsSection } from "@/components/sections/pillars-section";
import { VenturesSection } from "@/components/sections/ventures-section";
import { SkillsSection } from "@/components/sections/skills-section";
import { FeaturedSection } from "@/components/sections/featured-section";
import { ContactSection } from "@/components/sections/contact-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <PillarsSection />
      <VenturesSection />
      <SkillsSection />
      <FeaturedSection />
      <ContactSection />
    </>
  );
}
