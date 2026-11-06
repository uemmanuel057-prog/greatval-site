import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { skillGroups } from "@/lib/data/skills";
import { sectionSpacing } from "@/lib/section-style";
import type { SectionProps } from "@/lib/types";

export function SkillsSection({ page = false }: SectionProps) {
  return (
    <section
      id="skills"
      aria-labelledby="skills-title"
      className={sectionSpacing(page, "raised")}
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="skills-title"
            as={page ? "h1" : "h2"}
            large={page}
            eyebrow="Skill stack"
            title="The toolkit."
          />
        </Reveal>

        <Reveal>
          <div className="glass overflow-hidden rounded-2xl">
            {/* Code-window chrome */}
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <span className="size-3 rounded-full bg-white/15" />
              <span className="size-3 rounded-full bg-white/15" />
              <span className="size-3 rounded-full bg-accent/70" />
              <span className="ml-3 font-mono text-xs text-ink-subtle">
                stack.ts
              </span>
            </div>
            <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8">
              {skillGroups.map((group) => (
                <div key={group.id}>
                  <p className="font-mono text-sm text-code">
                    {"// "}
                    {group.title.toLowerCase()}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {group.skills.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-code/50 hover:text-code sm:text-sm"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
