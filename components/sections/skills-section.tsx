import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { skillGroups } from "@/lib/data/skills";

export function SkillsSection() {
  return (
    <section
      id="skills"
      aria-labelledby="skills-title"
      className="border-b border-line bg-raised py-20 sm:py-28"
    >
      <Container>
        <SectionHeading
          id="skills-title"
          eyebrow="Skill stack"
          title="The toolkit."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((group) => (
            <div key={group.id} className="card">
              <h3 className="text-lg">{group.title}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full border border-line-strong px-3 py-1 text-sm text-ink-muted"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
