import { brand } from "@/lib/graphics/brand";
import { fitFont } from "@/lib/graphics/fit";
import type { GraphicParams } from "@/lib/graphics/params";
import { CtaPill, Frame, Words, type Layout, type PortraitAsset } from "./frame";

export function MonthTemplate({ p, t, portrait }: { p: GraphicParams; t: Layout; portrait: PortraitAsset | null }) {
  const { px } = t;
  const headline = `Happy New Month of ${p.month}`;
  const itemSize = px(p.services.length > 4 ? 30 : t.wide ? 38 : 34);
  // Reserve room for everything under the headline so nothing reaches the footer.
  const listH = p.services.length * (Math.round(itemSize * 1.2) + px(12));
  const reserved = px(82) + px(82) + listH + (p.cta ? px(120) : 0);
  const size = fitFont(headline, t.contentW, Math.max(t.availH - reserved, px(150)), px(t.wide ? 116 : 104), px(40), { charWidth: 0.68, lineHeight: 1.1 });

  return (
    <Frame t={t} portrait={portrait}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: px(26), fontWeight: 700, letterSpacing: px(8), color: brand.cyan, marginBottom: px(22) }}>
          NEW MONTH
        </div>
        <Words text={headline} size={size} weight={900} color={brand.ink} highlightFrom={4} letterSpacing={-Math.round(size * 0.02)} />
        <div style={{ display: "flex", fontSize: px(24), letterSpacing: px(5), color: brand.muted, marginTop: px(40), marginBottom: px(18) }}>
          SERVICES THIS MONTH
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {p.services.map((service, i) => (
            <div key={`${service}-${i}`} style={{ display: "flex", alignItems: "center", marginBottom: px(12) }}>
              <div style={{ display: "flex", width: px(14), height: px(14), borderRadius: px(3), background: brand.gold, marginRight: px(20) }} />
              <div style={{ display: "flex", fontSize: itemSize, fontWeight: 700, color: brand.ink }}>{service}</div>
            </div>
          ))}
        </div>
        <CtaPill text={p.cta} t={t} />
      </div>
    </Frame>
  );
}
