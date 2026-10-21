/**
 * The shared design system.
 *
 * One palette, one typeface, no selectable themes — matching the Flutter app in
 * `mobile/`, which removed its five layouts for the same single monochrome
 * design. `tokens.ts` documents the mapping file by file.
 *
 * Two things live outside this directory on purpose:
 *
 * - The CSS custom properties in `src/index.css`, which are what Tailwind and
 *   shadcn actually resolve. `tokens.ts` mirrors them for the cases CSS cannot
 *   reach (SVG strokes, recharts series, canvas fills).
 * - `components/ui/button.tsx` and `components/ui/card.tsx`, which are edited
 *   in place rather than wrapped. Every `<Button>` and `<Card>` in the app
 *   already routes through them, so editing the variants re-skins the whole
 *   app at once; a parallel primitive would have left every un-migrated call
 *   site rendering the old shape.
 *
 * What lives here is what shadcn has no equivalent for.
 */

export { IconTile, type IconTileProps } from './IconTile';
export { ListRow, RowDivider, type ListRowProps } from './ListRow';
// #meehikasharma
export { ProgressBar, type ProgressBarProps } from './ProgressBar';
export { ProgressRing, type ProgressRingProps } from './ProgressRing';
export { StatTile, type StatTileProps } from './StatTile';
export {
  chartRamp,
  chartSeries,
  colors,
  minViewportWidth,
  motion,
  radius,
  spacing,
  stroke,
  typography,
} from './tokens';
