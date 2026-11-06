/**
 * Brand constants for generated graphics. The image renderer cannot read
 * CSS variables, so the site tokens from app/globals.css are mirrored here.
 */
export const brand = {
  canvas: "#0B0F17",
  navy: "#121824",
  line: "#1E2638",
  ink: "#F8FAFC",
  muted: "#94A3B8",
  gold: "#E5A93C",
  cyan: "#38BDF8",
  tagline: "Building Ideas. Creating Value. Documenting Growth.",
  domain: "greatval.co",
} as const;

export const ratios = {
  square: { label: "1:1 Square (Instagram)", width: 1080, height: 1080 },
  wide: { label: "16:9 Landscape (X / LinkedIn)", width: 1920, height: 1080 },
} as const;

export type GraphicRatio = keyof typeof ratios;
