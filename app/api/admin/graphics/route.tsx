import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { graphicSize, parseGraphicParams, type PortraitId } from "@/lib/graphics/params";
import { makeLayout, type PortraitAsset } from "@/components/graphics-generator/templates/frame";
import { QuoteTemplate } from "@/components/graphics-generator/templates/quote-template";
import { MonthTemplate } from "@/components/graphics-generator/templates/month-template";
import { SpotlightTemplate } from "@/components/graphics-generator/templates/spotlight-template";

// Fonts and photos never change per request, so they load once at module scope.
const fonts = [
  { name: "Geist", data: await readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf")), weight: 400 as const, style: "normal" as const },
  { name: "Geist", data: await readFile(join(process.cwd(), "assets/fonts/Geist-Bold.ttf")), weight: 700 as const, style: "normal" as const },
  { name: "Geist", data: await readFile(join(process.cwd(), "assets/fonts/Geist-Black.ttf")), weight: 900 as const, style: "normal" as const },
];

const dataUri = (buf: Buffer) => `data:image/png;base64,${buf.toString("base64")}`;
const portraits: Record<PortraitId, PortraitAsset> = {
  hero: { src: dataUri(await readFile(join(process.cwd(), "assets/graphics/hero.png"))), width: 800, height: 1000 },
  about: { src: dataUri(await readFile(join(process.cwd(), "assets/graphics/about.png"))), width: 800, height: 899 },
  contact: { src: dataUri(await readFile(join(process.cwd(), "assets/graphics/contact.png"))), width: 800, height: 1001 },
};

export async function GET(request: NextRequest) {
  // The proxy already gates this route. Checking again keeps it safe even if the proxy config changes.
  if (!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const p = parseGraphicParams(request.nextUrl.searchParams);
  const portrait = p.portrait ? portraits[p.portraitId] : null;
  const t = makeLayout(p.ratio, p.scale, Boolean(portrait));
  const Template = p.mode === "month" ? MonthTemplate : p.mode === "spotlight" ? SpotlightTemplate : QuoteTemplate;
  const graphic = <Template p={p} t={t} portrait={portrait} />;

  try {
    return new ImageResponse(graphic, {
      ...graphicSize(p),
      fonts,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Graphic render failed", error);
    return Response.json({ error: "Could not render the graphic." }, { status: 500 });
  }
}
