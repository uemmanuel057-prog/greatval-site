import Link from "next/link";
import {
  ArrowRight,
  Crown,
  GraduationCap,
  MapPin,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Portrait } from "@/components/ui/portrait";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import {
  aboutInterests,
  aboutPrinciples,
  aboutStandard,
} from "@/lib/data/about";
import { sectionSpacing } from "@/lib/section-style";
import type { SectionProps } from "@/lib/types";
import aboutPhoto from "@/public/images/great-val-about.webp";

const standardIcons: Record<string, LucideIcon> = {
  shield: Shield,
  crown: Crown,
};

export function AboutSection({ page = false }: SectionProps) {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className={sectionSpacing(page)}
    >
      <Container>
        {/* Intro */}
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <Reveal>
              <SectionHeading
                id="about-title"
                as={page ? "h1" : "h2"}
                large={page}
                eyebrow="About"
                title="One builder, four disciplines."
              />
            </Reveal>
            <Reveal>
              <p className="text-lg text-ink-muted">
                GREAT VAL is a digital creator, brand builder and
                growth-focused entrepreneur based in Nigeria, working where
                media, technology and storytelling meet. Web development,
                media production, marketing strategy and entrepreneurship
                are one practice: ideas become products, products need
                stories, and stories need systems to reach people.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="card flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                  <GraduationCap size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="eyebrow mb-1">Education</p>
                  <p className="font-semibold">B.Sc. Computer Science</p>
                  <p className="text-sm text-ink-muted">
                    Federal University Otuoke
                  </p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                  <MapPin size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="eyebrow mb-1">Based in</p>
                  <p className="font-semibold">Nigeria</p>
                  <p className="text-sm text-ink-muted">Available for collaborations</p>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="relative mx-auto w-full max-w-sm">
            <Portrait
              src={aboutPhoto}
              alt="GREAT VAL smiling, wearing a black GV cap and round glasses"
              aspect="aspect-[8/9]"
              position="object-[50%_20%]"
              sizes="(min-width: 1024px) 384px, 90vw"
              zoom={1}
              drift={0}
            />
            <p
              aria-hidden="true"
              className="glass absolute -bottom-4 -left-3 rounded-2xl px-4 py-2.5 font-mono text-xs text-ink sm:-left-6"
            >
              <span className="text-accent">{"//"}</span> brick by brick
            </p>
          </Reveal>
        </div>

        {/* The standard */}
        <div className="mt-20 sm:mt-28">
          <Reveal>
            <p className="eyebrow">The GREATVAL standard</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-5xl">
              A shield and a crown.
            </h2>
          </Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {aboutStandard.map((item, i) => {
              const Icon = standardIcons[item.id];
              return (
                <Reveal as="li" key={item.id} delay={i * 0.1}>
                  <TiltCard className="card beam h-full">
                    <span className="flex size-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <p className="eyebrow mt-6">{item.label}</p>
                    <h3 className="mt-2 text-xl sm:text-2xl">{item.title}</h3>
                    <p className="mt-3 text-ink-muted">{item.text}</p>
                  </TiltCard>
                </Reveal>
              );
            })}
          </ul>
        </div>

        {/* How I work */}
        <div className="mt-20 sm:mt-28">
          <Reveal>
            <p className="eyebrow">How I work</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-5xl">
              Brick by brick.
            </h2>
          </Reveal>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {aboutPrinciples.map((item, i) => (
              <Reveal as="li" key={item.title} delay={i * 0.08}>
                <div className="h-full border-t border-accent/40 pt-5">
                  <span className="font-mono text-sm text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-lg font-bold sm:text-xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-ink-muted">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* Right now + beyond the work */}
        <div className="mt-20 grid gap-5 sm:mt-28 lg:grid-cols-2">
          <Reveal>
            <div className="card h-full">
              <p className="eyebrow">Right now</p>
              <p className="mt-4 text-lg">
                Working in web development, Web3 and digital media, and
                documenting the journey in public: turning skills and
                experience into long-term value through content, products and
                platforms.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card h-full">
              <p className="eyebrow">Beyond the work</p>
              <p className="mt-4 text-ink-muted">
                These shape how the work gets done.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {aboutInterests.map((interest) => (
                  <li
                    key={interest}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-ink"
                  >
                    {interest}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {/* Where to go next */}
        <Reveal className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
          <Link
            href="/services"
            className="group inline-flex items-center gap-2 font-semibold text-accent"
          >
            See how I can help
            <ArrowRight
              size={18}
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 font-semibold text-ink hover:text-accent"
          >
            Start a conversation
            <ArrowRight
              size={18}
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
