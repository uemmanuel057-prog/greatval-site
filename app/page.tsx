import { HeroSection } from "@/components/sections/hero-section";
import { StorySection } from "@/components/sections/story-section";
import { WorkbenchSection } from "@/components/sections/workbench-section";
import { ExploreSection } from "@/components/sections/explore-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StorySection />
      <WorkbenchSection />
      <ExploreSection />
    </>
  );
}
