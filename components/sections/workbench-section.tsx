import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";
import { featuredAssets } from "@/lib/data/featured";
import { clientSupport, ventures } from "@/lib/data/ventures";
import { webProjects } from "@/lib/data/projects";

interface Chip {
  kind: string;
  label: string;
  note: string;
}

const statusLabel = {
  "in-progress": "In progress",
  "coming-soon": "Coming soon",
  active: "Active",
} as const;

/** Row 1: what is being made and shipped. Statuses come from the data files. */
const makingRow: Chip[] = [
  ...featuredAssets.map((a) => ({
    kind: a.type,
    label: a.title,
    note: statusLabel[a.status],
  })),
  ...webProjects
    .filter((p) => !p.isThisSite)
    .map((p) => ({ kind: "Website", label: p.name, note: "Live" })),
  { kind: "Website", label: "GREAT VAL", note: "You are here" },
];

/** Row 2: the ventures and the brands supported. */
const venturesRow: Chip[] = [
  ...ventures.map((v) => ({ kind: v.category, label: v.name, note: v.role })),
  ...clientSupport.brands.map((b) => ({
    kind: "Client growth",
    label: b,
    note: clientSupport.role,
  })),
];

function Row({ chips, reverse = false }: { chips: Chip[]; reverse?: boolean }) {
  // The list is rendered twice so the loop is seamless. The copy is hidden
  // from assistive tech.
  return (
    <div className="marquee overflow-hidden">
      <ul
        className={`marquee-track flex w-max gap-4 ${reverse ? "marquee-reverse" : ""}`}
      >
        {[0, 1].map((copy) =>
          chips.map((chip) => (
            <li
              key={`${copy}-${chip.label}`}
              aria-hidden={copy === 1 ? true : undefined}
              className="glass flex shrink-0 items-center gap-3 rounded-full py-2.5 pl-5 pr-6"
            >
              <span className="font-mono text-[0.7rem] uppercase tracking-widest text-accent">
                {chip.kind}
              </span>
              <span className="font-semibold">{chip.label}</span>
              <span className="text-sm text-ink-muted">{chip.note}</span>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

/** Home strip: a slow, hover-to-pause marquee of real work in motion. */
export function WorkbenchSection() {
  return (
    <section
      id="workbench"
      aria-labelledby="workbench-title"
      className="border-b border-line bg-raised py-16 sm:py-24"
    >
      <Container>
        <Reveal>
          <p className="eyebrow">On the workbench</p>
          <h2
            id="workbench-title"
            className="mt-3 max-w-2xl text-3xl font-bold sm:text-5xl"
          >
            Always something being built.
          </h2>
        </Reveal>
      </Container>
      <Reveal className="mt-10 space-y-4">
        <Row chips={makingRow} />
        <Row chips={venturesRow} reverse />
      </Reveal>
    </section>
  );
}
