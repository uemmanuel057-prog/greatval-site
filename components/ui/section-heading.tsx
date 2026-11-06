interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
  /** Use "h1" when the heading is the title of its own page. */
  as?: "h1" | "h2";
  /** Larger size for page titles. */
  large?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  as: Tag = "h2",
  large = false,
}: SectionHeadingProps) {
  return (
    <div className="mb-10 max-w-2xl sm:mb-14">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <Tag
        id={id}
        className={
          large
            ? "text-4xl sm:text-5xl lg:text-6xl"
            : "text-3xl sm:text-4xl lg:text-5xl"
        }
      >
        {title}
      </Tag>
      {description ? (
        <p className="mt-5 text-base text-ink-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
