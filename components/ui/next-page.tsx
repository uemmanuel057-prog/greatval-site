import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";
import { sitePages } from "@/lib/site";

/** Large "continue" link at the bottom of each page. */
export function NextPage({ current }: { current: string }) {
  const index = sitePages.findIndex((page) => page.href === current);
  const next = sitePages[index + 1];

  const href = next ? next.href : "/";
  const eyebrow = next ? "Up next" : "Back to the start";
  const title = next ? next.label : "Home";
  const blurb = next ? next.blurb : "Return to the home screen.";

  return (
    <Container className="pb-20 sm:pb-28">
      <Reveal>
        <Link
          href={href}
          className="glass beam group flex items-center justify-between gap-6 rounded-3xl p-6 transition-colors hover:bg-white/[0.07] sm:p-10"
        >
          <span>
            <span className="eyebrow">{eyebrow}</span>
            <span className="mt-3 block text-3xl font-bold sm:text-5xl">
              {title}
            </span>
            <span className="mt-2 block max-w-md text-ink-muted">{blurb}</span>
          </span>
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-canvas transition-transform duration-300 group-hover:translate-x-1 sm:size-16">
            <ArrowRight size={26} aria-hidden="true" />
          </span>
        </Link>
      </Reveal>
    </Container>
  );
}
