import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { featuredAssets } from "@/lib/data/featured";
import type { FeaturedAsset } from "@/lib/types";

const statusLabel: Record<FeaturedAsset["status"], string> = {
  "in-progress": "In progress",
  "coming-soon": "Coming soon",
  active: "Active",
};

export function FeaturedSection() {
  return (
    <section
      id="featured"
      aria-labelledby="featured-title"
      className="border-b border-line py-20 sm:py-28"
    >
      <Container>
        <SectionHeading
          id="featured-title"
          eyebrow="Featured"
          title="Books, podcasts & commentary."
          description="Building in public means the work is never finished. Here is what is in motion."
        />
        <ul className="grid gap-5 md:grid-cols-3">
          {featuredAssets.map((asset) => (
            <li key={asset.id} className="card flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow">{asset.type}</p>
                <span className="rounded-full border border-accent-deep/60 px-3 py-1 text-xs text-accent">
                  {statusLabel[asset.status]}
                </span>
              </div>
              <h3 className="mt-5 text-xl sm:text-2xl">{asset.title}</h3>
              {asset.subtitle ? (
                <p className="mt-2 text-sm text-ink-muted">
                  {asset.subtitle}
                </p>
              ) : null}
              <p className="mt-4 text-ink-muted">{asset.description}</p>
              {asset.href ? (
                <a href={asset.href} className="btn-ghost mt-6 self-start">
                  Open
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
