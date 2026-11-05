import { GraduationCap } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export function AboutSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="border-b border-line py-20 sm:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="about-title"
            eyebrow="About"
            title="One builder, four disciplines."
          />
        </Reveal>
        <div className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <p className="text-lg text-ink-muted">
              GREAT VAL brings together web development, media production,
              marketing strategy, and entrepreneurship. Rather than fitting
              one narrow title, the work connects them: ideas become
              products, products need stories, and stories need systems to
              reach people.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
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
      </Container>
    </section>
  );
}
