import { ArrowRight, Code, Megaphone, Radio, Zap, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { CursorOrb } from "@/components/motion/cursor-orb";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { siteConfig } from "@/lib/site";

interface Chip {
  icon: LucideIcon;
  label: string;
}

const chips: Chip[] = [
  { icon: Code, label: "Next.js · React · TypeScript" },
  { icon: Radio, label: "Live multi-cam · vMix" },
  { icon: Megaphone, label: "Meta & Google Ads" },
  { icon: Zap, label: "Solar · IP CCTV" },
];

export function HeroSection() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden border-b border-line"
    >
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
      <CursorOrb />

      <Container className="relative py-20 sm:py-28 lg:py-40">
        <Reveal>
          <p className="glass inline-flex max-w-full items-center gap-3 rounded-full px-4 py-2 text-xs sm:text-sm">
            <span className="pulse-dot shrink-0" aria-hidden="true" />
            <span>Available for Strategic Collaborations &amp; Technical Projects</span>
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="eyebrow mt-8">
            Web Developer · Creator · Strategist · Entrepreneur
          </p>
        </Reveal>

        <SplitText
          as="h1"
          id="hero-title"
          text="GREAT VAL"
          by="char"
          accent="VAL"
          delay={0.2}
          className="mt-5 text-6xl sm:text-8xl lg:text-9xl"
        />

        <SplitText
          as="p"
          text={siteConfig.tagline}
          delay={0.9}
          className="mt-6 max-w-2xl text-xl font-medium text-ink sm:text-2xl"
        />

        <Reveal delay={1.5}>
          <p className="mt-6 max-w-xl text-base text-ink-muted sm:text-lg">
            A web developer and hybrid practitioner bridging technical
            execution, media production, and digital growth, and documenting
            the process along the way.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
            <Magnetic>
              <a href="#ventures" data-beam="always" className="btn-gold">
                See the ventures
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </Magnetic>
            <Magnetic>
              <a href="#contact" className="btn-glass">
                Get in touch
              </a>
            </Magnetic>
          </div>

          {/* Small screens: compact chip row */}
          <ul className="mt-10 flex flex-wrap gap-2 lg:hidden">
            {chips.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-ink-muted"
              >
                <Icon size={14} className="text-code" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Large screens: floating glass chips */}
        <ul
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-8 hidden w-72 lg:block"
        >
          {[
            { chip: chips[0], pos: "top-[18%] right-4", anim: "float-a" },
            { chip: chips[1], pos: "top-[38%] right-24", anim: "float-b" },
            { chip: chips[2], pos: "top-[58%] right-0", anim: "float-c" },
            { chip: chips[3], pos: "top-[76%] right-20", anim: "float-a" },
          ].map(({ chip, pos, anim }) => (
            <li
              key={chip.label}
              className={`glass absolute flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm text-ink ${pos} ${anim}`}
            >
              <chip.icon size={18} className="text-code" />
              {chip.label}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
