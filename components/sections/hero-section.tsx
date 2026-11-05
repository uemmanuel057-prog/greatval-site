import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function HeroSection() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative overflow-hidden border-b border-line"
    >
      {/* Soft amber glow, purely decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 size-[28rem] rounded-full bg-accent-deep/15 blur-3xl"
      />
      <Container className="relative py-20 sm:py-28 lg:py-36">
        <p className="eyebrow mb-6">
          Web Developer · Creator · Strategist · Entrepreneur
        </p>
        <h1
          id="hero-title"
          className="max-w-4xl text-5xl sm:text-6xl lg:text-8xl"
        >
          GREAT <span className="text-accent">VAL</span>
        </h1>
        <p className="mt-6 max-w-2xl text-xl font-medium text-ink sm:text-2xl">
          {siteConfig.tagline}
        </p>
        <p className="mt-6 max-w-2xl text-base text-ink-muted sm:text-lg">
          A web developer and hybrid practitioner bridging technical
          execution, media production, and digital growth, and
          documenting the process along the way.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a href="#ventures" className="btn-primary">
            See the ventures
          </a>
          <a href="#contact" className="btn-ghost">
            Get in touch
          </a>
        </div>
      </Container>
    </section>
  );
}
