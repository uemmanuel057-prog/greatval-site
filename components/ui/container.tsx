import type { ElementType, ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

/** Consistent page gutters and max width. */
export function Container({
  children,
  as: Tag = "div",
  className = "",
}: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>
      {children}
    </Tag>
  );
}
