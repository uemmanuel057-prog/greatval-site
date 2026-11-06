import { GraduationCap } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Portrait } from "@/components/ui/portrait";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { sectionSpacing } from "@/lib/section-style";
import type { SectionProps } from "@/lib/types";
import aboutPhoto from "@/public/images/great-val-about.webp";

export function AboutSection({ page = false }: SectionProps) {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className={sectionSpacing(page)}
    >
      <Container className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
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
              GREAT VAL brings together web development, media production,
              marketing strategy, and entrepreneurship. Rather than fitting
              one narrow title, the work connects them: ideas become
              products, products need stories, and stories need systems to
              reach people.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <div className="card flex items-center gap-5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
                <GraduationCap size={26} aria-hidden="true" />
              </span>
              <div>
                <p className="eyebrow mb-2">Education</p>
                <p className="text-lg font-semibold">B.Sc. Computer Science</p>
                <p className="text-ink-muted">Federal University Otuoke</p>
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
      </Container>
    </section>
  );
}
