import { monthNames, newMonthName } from "@/lib/graphics/month";
import { ratios, type GraphicRatio } from "@/lib/graphics/brand";

export type GraphicMode = "quote" | "month" | "spotlight";
export type PortraitId = "hero" | "about" | "contact";

export const portraitOptions: { id: PortraitId; label: string }[] = [
  { id: "hero", label: "Studio (dark)" },
  { id: "about", label: "Smiling in cap" },
  { id: "contact", label: "Black & white" },
];

export interface GraphicParams {
  mode: GraphicMode;
  ratio: GraphicRatio;
  /** 1 = 1080px tall, 2 = double resolution. */
  scale: 1 | 2;
  portrait: boolean;
  portraitId: PortraitId;
  quote: string;
  author: string;
  /** Empty means "detect from today's date". */
  month: string;
  services: string[];
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
}

export const defaultParams: GraphicParams = {
  mode: "quote",
  ratio: "square",
  scale: 1,
  portrait: true,
  portraitId: "hero",
  quote: "One brick at a time is still progress.",
  author: "GREAT VAL",
  month: "",
  services: [
    "Meta & Google Ads",
    "Multi-Cam Broadcasting",
    "Web & Tech Solutions",
    "Copywriting",
  ],
  eyebrow: "Service Spotlight",
  headline: "Professional Website Design",
  body: "Fast, mobile-first websites built end to end, then deployed and handed over.",
  cta: "",
};

const limits = { quote: 300, author: 40, eyebrow: 32, headline: 80, body: 220, cta: 60, service: 40, services: 6 };

/** Query string used by the preview and download buttons. */
export function buildGraphicQuery(p: GraphicParams): string {
  const q = new URLSearchParams();
  q.set("mode", p.mode);
  q.set("ratio", p.ratio);
  q.set("scale", String(p.scale));
  q.set("portrait", p.portrait ? "1" : "0");
  q.set("pid", p.portraitId);
  q.set("quote", p.quote);
  q.set("author", p.author);
  if (p.month) q.set("month", p.month);
  p.services.forEach((s) => q.append("s", s));
  q.set("eyebrow", p.eyebrow);
  q.set("headline", p.headline);
  q.set("body", p.body);
  q.set("cta", p.cta);
  return q.toString();
}

const clip = (value: string | null, max: number, fallback: string) =>
  (value ?? fallback).replace(/\s+/g, " ").trim().slice(0, max);

/** Validates and clamps untrusted query input. Never throws. */
export function parseGraphicParams(sp: URLSearchParams): GraphicParams {
  const mode = (["quote", "month", "spotlight"] as const).find((m) => m === sp.get("mode")) ?? "quote";
  const ratio: GraphicRatio = sp.get("ratio") === "wide" ? "wide" : "square";
  const pid = portraitOptions.find((o) => o.id === sp.get("pid"))?.id ?? "hero";
  const monthRaw = sp.get("month") ?? "";
  const month = monthNames.find((m) => m.toLowerCase() === monthRaw.toLowerCase()) ?? newMonthName();
  const services = sp
    .getAll("s")
    .map((s) => s.replace(/\s+/g, " ").trim().slice(0, limits.service))
    .filter(Boolean)
    .slice(0, limits.services);

  return {
    mode,
    ratio,
    scale: sp.get("scale") === "2" ? 2 : 1,
    portrait: sp.get("portrait") !== "0",
    portraitId: pid,
    quote: clip(sp.get("quote"), limits.quote, defaultParams.quote),
    author: clip(sp.get("author"), limits.author, ""),
    month,
    services: services.length ? services : defaultParams.services,
    eyebrow: clip(sp.get("eyebrow"), limits.eyebrow, ""),
    headline: clip(sp.get("headline"), limits.headline, defaultParams.headline),
    body: clip(sp.get("body"), limits.body, ""),
    cta: clip(sp.get("cta"), limits.cta, ""),
  };
}

export const graphicSize = (p: Pick<GraphicParams, "ratio" | "scale">) => ({
  width: ratios[p.ratio].width * p.scale,
  height: ratios[p.ratio].height * p.scale,
});
