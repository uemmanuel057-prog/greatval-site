/**
 * Picks the largest font size (px) at which `text` fits a box, using an
 * average-glyph-width estimate. The renderer has no text measuring, so this
 * keeps long messages from overflowing the canvas.
 */
export function fitFont(
  text: string,
  boxWidth: number,
  boxHeight: number,
  max: number,
  min: number,
  { charWidth = 0.58, lineHeight = 1.18 }: { charWidth?: number; lineHeight?: number } = {},
): number {
  for (let size = max; size > min; size -= 2) {
    const perLine = Math.max(1, Math.floor(boxWidth / (size * charWidth)));
    // Word wrapping wastes some space, so add a little slack to the line count.
    const lines = Math.ceil((text.length / perLine) * 1.08);
    if (lines * size * lineHeight <= boxHeight) return size;
  }
  return min;
}
