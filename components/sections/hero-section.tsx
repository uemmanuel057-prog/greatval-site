import Image from "next/image";
import { ArrowRight, Code, Megaphone, Radio, Zap, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { CursorOrb } from "@/components/motion/cursor-orb";
import { Magnetic } from "@/components/motion/magnetic";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { siteConfig } from "@/lib/site";
import heroPhoto from "@/public/images/great-val-hero.webp";

interface Chip {
  icon: LucideIcon;
  label: string;
  /** Position around the face (large screens only). */
  pos: string;
  anim: string;
}

const chips: Chip[] = [
  { icon: Code, label: "Next.js · React · TypeScript", pos: "top-[2%] right-[4%]", anim: "float-a" },
  { icon: Radio, label: "Live multi-cam · vMix", pos: "top-[66%] -left-4", anim: "float-b" },
  { icon: Megaphone, label: "Meta & Google Ads", pos: "top-[46%] right-[-2%]", anim: "float-c" },
  { icon: Zap, label: "Solar · IP CCTV", pos: "top-[88%] right-[14%]", anim: "float-a" },
];

export function HeroSection() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden border-b border-line bg-canvas"
    >
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
      <CursorOrb />

      {/* Portrait that blends into the hero background */}
      <Reveal
        y={0}
        className="hero-photo pointer-events-none absolute inset-x-0 top-0 -z-[5] h-[540px] sm:h-[660px] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[60%]"
      >
        <Parallax className="absolute inset-0" scale={1.08} offset={16}>
          <Image
            src={heroPhoto}
            alt="GREAT VAL in profile, lit by red and blue studio light"
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover object-[100%_18%] sm:object-[70%_18%] lg:object-[55%_22%]"
          />
        </Parallax>
      </Reveal>

      <Container className="relative grid items-center gap-14 pb-16 pt-[350px] sm:pb-24 sm:pt-[450px] lg:min-h-[700px] lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-36">
        <div>
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
            className="mt-5 text-6xl sm:text-8xl lg:text-7xl xl:text-8xl"
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
              execution, media production, and digital growth, and
              documenting the process along the way.
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
        </div>

        {/* Large screens: glass chips floating around the face */}
        <ul
          aria-hidden="true"
          className="pointer-events-none relative hidden h-[480px] lg:block"
        >
          {chips.map(({ icon: Icon, label, pos, anim }) => (
            <li
              key={label}
              className={`glass absolute flex items-center gap-2.5 whitespace-nowrap rounded-2xl px-4 py-3 text-sm text-ink ${pos} ${anim}`}
            >
              <Icon size={18} className="text-code" />
              {label}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
