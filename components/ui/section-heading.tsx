interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
}: SectionHeadingProps) {
  return (
    <div className="mb-10 max-w-2xl sm:mb-14">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h2 id={id} className="text-3xl sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-base text-ink-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
