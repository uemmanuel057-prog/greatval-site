import { brand } from "@/lib/graphics/brand";
import { fitFont } from "@/lib/graphics/fit";
import type { GraphicParams } from "@/lib/graphics/params";
import { CtaPill, Frame, type Layout, type PortraitAsset } from "./frame";

export function SpotlightTemplate({ p, t, portrait }: { p: GraphicParams; t: Layout; portrait: PortraitAsset | null }) {
  const { px } = t;
  const reserved = px(70) + (p.cta ? px(120) : 0);
  const bodyBox = p.body ? t.availH * 0.28 : 0;
  const headSize = fitFont(p.headline, t.contentW, t.availH - reserved - bodyBox, px(t.wide ? 110 : 100), px(40), { charWidth: 0.66, lineHeight: 1.08 });
  const bodySize = p.body ? fitFont(p.body, t.contentW, bodyBox, px(t.wide ? 40 : 36), px(24), { charWidth: 0.52, lineHeight: 1.35 }) : 0;

  return (
    <Frame t={t} portrait={portrait}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {p.eyebrow ? (
          <div style={{ display: "flex", fontSize: px(26), fontWeight: 700, letterSpacing: px(8), color: brand.cyan, marginBottom: px(24) }}>
            {p.eyebrow.toUpperCase()}
          </div>
        ) : null}
        <div style={{ display: "flex", width: px(72), height: px(6), borderRadius: px(3), background: brand.gold, marginBottom: px(28) }} />
        <div
          style={{
            display: "flex",
            fontSize: headSize,
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: -Math.round(headSize * 0.02),
            color: brand.ink,
          }}
        >
          {p.headline}
        </div>
        {p.body ? (
          <div style={{ display: "flex", fontSize: bodySize, lineHeight: 1.35, color: brand.muted, marginTop: px(28) }}>
            {p.body}
          </div>
        ) : null}
        <CtaPill text={p.cta} t={t} />
      </div>
    </Frame>
  );
}
