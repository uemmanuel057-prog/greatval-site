import { ArrowUpRight, Download } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { webProjects } from "@/lib/data/projects";
import { sectionSpacing } from "@/lib/section-style";
import type { SectionProps } from "@/lib/types";

function hostOf(url: string): string {
  return new URL(url).host;
}

export function ProjectsSection({ page = false }: SectionProps) {
  return (
    <section
      id="projects"
      aria-labelledby="projects-title"
      className={sectionSpacing(page, "raised")}
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="projects-title"
            as={page ? "h1" : "h2"}
            large={page}
            eyebrow="Projects"
            title="Websites & apps I've built."
            description="Live sites and apps in progress, designed and developed end to end. Open any of them to see the real thing."
          />
        </Reveal>

        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {webProjects.map((project, i) => (
            <Reveal as="li" key={project.id} delay={(i % 3) * 0.1}>
              <TiltCard className="card beam flex h-full flex-col !p-0 overflow-hidden">
                {/* Browser-window header */}
                <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-accent/70" />
                  <span className="ml-3 truncate rounded-md bg-black/30 px-3 py-1 font-mono text-xs text-code">
                    {project.platformLabel ?? hostOf(project.url)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow">{project.category}</p>
                    {project.isThisSite || project.status === "in-progress" ? (
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-accent/40 px-2.5 py-0.5 font-mono text-xs text-accent">
                        {project.isThisSite ? "This site" : "In progress"}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-4 text-2xl">{project.name}</h3>
                  <p className="mt-3 text-ink-muted">{project.description}</p>

                  <ul className="mt-5 flex flex-wrap gap-2">
                    {project.highlights.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-code/30 bg-code/10 px-3 py-1 font-mono text-xs text-code"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>

                  {project.kind === "app" ? (
                    <div className="mt-7 flex flex-col items-start gap-2">
                      <a href={project.url} className="btn-glass">
                        {project.action?.label ?? "Download"}
                        <Download size={18} aria-hidden="true" />
                        <span className="sr-only"> (downloads the {project.name} Android app)</span>
                      </a>
                      {project.action?.note ? (
                        <p className="font-mono text-xs text-ink-muted">{project.action.note}</p>
                      ) : null}
                    </div>
                  ) : (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-glass mt-7 self-start"
                    >
                      {project.action?.label ?? "Visit site"}
                      <ArrowUpRight size={18} aria-hidden="true" />
                      <span className="sr-only"> (opens {project.name} in a new tab)</span>
                    </a>
                  )}
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
