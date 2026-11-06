import { ArrowUpRight } from "lucide-react";
import { socialLinks } from "@/lib/site";

interface SocialLinksProps {
  /** "pills" shows a wrapped row of chips, "list" shows a stacked column. */
  variant?: "pills" | "list";
  className?: string;
}

/** External social profile links. They open in a new tab. */
export function SocialLinks({
  variant = "pills",
  className = "",
}: SocialLinksProps) {
  return (
    <ul
      className={`${
        variant === "pills" ? "flex flex-wrap gap-3" : "space-y-3"
      } ${className}`}
    >
      {socialLinks.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.label}${link.handle ? ` ${link.handle}` : ""} (opens in a new tab)`}
            className={
              variant === "pills"
                ? "glass group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:border-accent/50 hover:text-accent"
                : "group inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-accent"
            }
          >
            {link.label}
            <ArrowUpRight
              size={14}
              aria-hidden="true"
              className="text-accent transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
