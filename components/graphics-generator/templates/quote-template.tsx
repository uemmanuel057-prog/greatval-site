import { brand } from "@/lib/graphics/brand";
import { fitFont } from "@/lib/graphics/fit";
import type { GraphicParams } from "@/lib/graphics/params";
import { CtaPill, Frame, type Layout, type PortraitAsset } from "./frame";

export function QuoteTemplate({ p, t, portrait }: { p: GraphicParams; t: Layout; portrait: PortraitAsset | null }) {
  const { px } = t;
  const reserved = px(130) + (p.author ? px(80) : 0) + (p.cta ? px(120) : 0);
  const size = fitFont(p.quote, t.contentW, t.availH - reserved, px(t.wide ? 84 : 80), px(30));

  return (
    <Frame t={t} portrait={portrait}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            height: px(110),
            fontSize: px(220),
            fontWeight: 900,
            lineHeight: 1,
            color: brand.gold,
          }}
        >
          {"“"}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: size,
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: -Math.round(size * 0.015),
            color: brand.ink,
          }}
        >
          {p.quote}
        </div>
        {p.author ? (
          <div style={{ display: "flex", alignItems: "center", marginTop: px(36) }}>
            <div style={{ display: "flex", width: px(64), height: px(6), borderRadius: px(3), background: brand.gold, marginRight: px(20) }} />
            <div style={{ display: "flex", fontSize: px(32), fontWeight: 700, letterSpacing: px(3), color: brand.gold }}>
              {p.author.toUpperCase()}
            </div>
          </div>
        ) : null}
        <CtaPill text={p.cta} t={t} />
      </div>
    </Frame>
  );
}
