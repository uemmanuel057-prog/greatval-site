import type { ReactNode } from "react";
import { brand, ratios, type GraphicRatio } from "@/lib/graphics/brand";

/** Everything a template needs to size itself. All lengths are in output pixels. */
export interface Layout {
  w: number;
  h: number;
  s: number;
  wide: boolean;
  pad: number;
  /** Width of the text column. */
  contentW: number;
  /** Height available to the main content above the footer. */
  availH: number;
  stackFooter: boolean;
  px: (n: number) => number;
}

export interface PortraitAsset {
  src: string; // data URI
  width: number;
  height: number;
}

export function makeLayout(ratio: GraphicRatio, scale: number, hasPortrait: boolean): Layout {
  const base = ratios[ratio];
  const wide = ratio === "wide";
  const px = (n: number) => Math.round(n * scale);
  const w = base.width * scale;
  const h = base.height * scale;
  const pad = px(wide ? 96 : 80);
  const contentW = hasPortrait ? Math.round(w * (wide ? 0.56 : 0.6)) - pad : w - pad * 2;
  const footerH = px(hasPortrait ? 200 : 120);
  return { w, h, s: scale, wide, pad, contentW, availH: h - pad * 2 - footerH, stackFooter: hasPortrait, px };
}

/** Call-to-action pill. Renders nothing for empty text. */
export function CtaPill({ text, t }: { text: string; t: Layout }) {
  if (!text) return null;
  const { px } = t;
  return (
    <div style={{ display: "flex", marginTop: px(40) }}>
      <div
        style={{
          display: "flex",
          background: brand.gold,
          color: brand.canvas,
          fontSize: px(t.wide ? 34 : 32),
          fontWeight: 700,
          padding: `${px(18)}px ${px(38)}px`,
          borderRadius: px(999),
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** Wordmark, tagline and domain. */
function Footer({ t }: { t: Layout }) {
  const { px } = t;
  const wordmark = (
    <div style={{ display: "flex", fontSize: px(34), fontWeight: 900, letterSpacing: px(6) }}>
      <span style={{ color: brand.ink }}>GREAT</span>
      <span style={{ color: brand.gold, marginLeft: px(14) }}>VAL</span>
    </div>
  );
  const tagline = (
    <div style={{ display: "flex", color: brand.muted, fontSize: px(t.wide ? 26 : 24), marginTop: px(8) }}>
      {brand.tagline}
    </div>
  );
  const domain = (
    <div style={{ display: "flex", color: brand.cyan, fontSize: px(t.wide ? 30 : 28), fontWeight: 700, letterSpacing: px(1) }}>
      {brand.domain}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderTop: `${Math.max(1, px(2))}px solid ${brand.line}`,
        paddingTop: px(26),
      }}
    >
      {t.stackFooter ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {wordmark}
          {tagline}
          <div style={{ display: "flex", marginTop: px(12) }}>{domain}</div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {wordmark}
            {tagline}
          </div>
          {domain}
        </div>
      )}
    </div>
  );
}

/** Branded canvas: gradient, glows, optional portrait, content column and footer. */
export function Frame({
  t,
  portrait,
  children,
}: {
  t: Layout;
  portrait: PortraitAsset | null;
  children: ReactNode;
}) {
  const ph = Math.round(t.wide ? t.h * 1.02 : t.h * 0.66);
  const pw = portrait ? Math.round((ph * portrait.width) / portrait.height) : 0;

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: t.w,
        height: t.h,
        background: `linear-gradient(135deg, ${brand.canvas} 0%, ${brand.navy} 100%)`,
        fontFamily: "Geist",
        color: brand.ink,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: t.w,
          height: t.h,
          background:
            "radial-gradient(circle at 12% 8%, rgba(229,169,60,0.16) 0%, rgba(229,169,60,0) 55%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: t.w,
          height: t.h,
          background:
            "radial-gradient(circle at 92% 96%, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0) 50%)",
        }}
      />
      {portrait ? (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by the image engine, not the browser
        <img
          src={portrait.src}
          alt=""
          width={pw}
          height={ph}
          style={{ position: "absolute", right: -Math.round(pw * 0.05), bottom: t.wide ? -Math.round(ph * 0.02) : -Math.round(ph * 0.03), width: pw, height: ph }}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          width: portrait ? t.contentW + t.pad : t.w,
          height: t.h,
          padding: t.pad,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, width: t.contentW }}>
          {children}
        </div>
        <Footer t={t} />
      </div>
    </div>
  );
}

/** Wraps text word by word so single words can be coloured. */
export function Words({
  text,
  size,
  weight = 700,
  color,
  highlightFrom,
  highlightColor = brand.gold,
  lineHeight = 1.1,
  letterSpacing = 0,
}: {
  text: string;
  size: number;
  weight?: number;
  color: string;
  /** Words from this index onward use the highlight colour. */
  highlightFrom?: number;
  highlightColor?: string;
  lineHeight?: number;
  letterSpacing?: number;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {text.split(" ").map((word, i) => (
        <div
          key={`${word}-${i}`}
          style={{
            display: "flex",
            fontSize: size,
            fontWeight: weight,
            lineHeight,
            letterSpacing,
            marginRight: Math.round(size * 0.26),
            color: highlightFrom !== undefined && i >= highlightFrom ? highlightColor : color,
          }}
        >
          {word}
        </div>
      ))}
    </div>
  );
}
