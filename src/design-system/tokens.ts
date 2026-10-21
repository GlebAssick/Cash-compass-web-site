/**
 * The design tokens, in TypeScript.
 *
 * These mirror `mobile/lib/app/theme/` value for value. The CSS custom
 * properties in `src/index.css` are the source of truth for anything Tailwind
 * or shadcn resolves; this module exists for the cases CSS cannot reach —
 * an SVG `stroke`, a recharts series colour, a canvas fill, a framer-motion
 * value.
 *
 * Keep the two in step. A colour that exists here and not there is a colour
 * that will drift.
 */

/**
 * The palette. Two poles and four greys, plus one reserved red.
 *
 * Mirrors `AppColors` in `mobile/lib/app/theme/app_colors.dart`.
 */
export const colors = {
  /** #000000 — type, container edges, filled controls. */
  ink: '#000000',

  /** #FFFFFF — the ground, and type on an ink panel. */
  surface: '#FFFFFF',

  /**
   * #4A4A4A — secondary type. Measures 8.7:1 on white.
   *
   * The muted step for *text*. Not interchangeable with `disabled`, which is
   * deliberately below the text contrast floor.
   */
  inkSecondary: '#4A4A4A',

  /**
   * #000000 — the edge of a container: cards, inputs, tiles, chips.
   *
   * Deliberately *not* the same value as `hairline`. Container edges and the
   * rules inside them do different jobs, and giving them one colour is what
   * makes a card full of rows read as a table.
   */
  outline: '#000000',

  /**
   * #E0E0E0 — rules *inside* a container: dividers between rows, separators.
   *
   * Non-text; never put type on this. Stays pale on purpose — these sit within
   * a boundary that is already drawn, so they only need to group.
   */
  hairline: '#E0E0E0',

  /** #F5F5F5 — the one recessed fill, for a figure the page is derived from. */
  subtleFill: '#F5F5F5',

  /**
   * #9E9E9E — disabled controls. 2.7:1, below the text floor by design:
   * a disabled control is meant to recede.
   */
  disabled: '#9E9E9E',

  /** #8A8A8A — muted type *on* an ink panel, where `inkSecondary` would vanish. */
  onInkDim: '#8A8A8A',

  /** #D8D8D8 — the decorative background curves. 1.36:1: visible, never read. */
  backdropLine: '#D8D8D8',

  /**
   * #C62828 — the one reserved colour, for destructive confirmation only.
   *
   * 5.6:1 on white. Everything else in this design communicates by icon and
   * weight; this exists because relying on weight alone to distinguish "Reset
   * all data" from "Cancel" is how someone wipes their data by accident.
   */
  error: '#C62828',

  /** #FFFFFF — type on `error`. */
  onError: '#FFFFFF',
} as const;

// #vanshkapoor
/**
 * The chart ramp: five steps of grey, light to dark, for donut slices and
 * categorical series.
 *
 * Mirrors `_sliceRamp` in `mobile/lib/widgets/financial_charts.dart`. Capped
 * at 2.2:1 between adjacent steps — enough to tell two slices apart, and the
 * reason a legend is mandatory rather than optional on every chart that uses
 * it. Adjacent slices must never rely on colour alone to be distinguishable.
 */
export const chartRamp = [
  '#000000',
  '#333333',
  '#5C5C5C',
  '#858585',
  '#ADADAD',
] as const;

/** Income vs expense, the one place two series are compared directly. */
export const chartSeries = {
  income: colors.ink,
  expense: '#858585',
  /** Gridlines and axes. The pale rule, not the container edge. */
  grid: colors.hairline,
} as const;

/**
 * The spacing scale. Mirrors `AppSpacing`.
 *
 * Values are px numbers rather than Tailwind classes so they compose in
 * inline styles and SVG geometry. Prefer the Tailwind class where one exists.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Corner radii. Mirrors `AppRadius`. */
export const radius = {
  /** 20px — cards and any bounded surface. */
  surface: 20,
  /** 14px — inputs, selects, non-pill controls. */
  control: 14,
  /** 10px — icon tiles and small chips. */
  small: 10,
  /** Fully round: buttons and status chips. */
  pill: 999,
} as const;

/** Stroke widths. Mirrors `AppStroke`. */
export const stroke = {
  /** 1px — every container edge and every divider. */
  hairline: 1,
  /** 6px — the progress ring's arc and track. */
  ring: 6,
} as const;

/**
 * The type scale. Mirrors `AppTypography.scale()`.
 *
 * Sizes are px; weights are CSS numeric weights. Negative tracking on the
 * larger sizes is what keeps Manrope from looking loose at display size.
 */
export const typography = {
  family: "'Manrope', ui-sans-serif, system-ui, sans-serif",

  /** 34/700 — the one figure a screen exists to show. */
  display: { size: 34, weight: 700, tracking: -0.8, leading: 1.15 },
  /** 24/700 — screen title. */
  title: { size: 24, weight: 700, tracking: -0.4, leading: 1.2 },
  /** 18/700 — card and section headers. */
  header: { size: 18, weight: 700, tracking: -0.2, leading: 1.25 },
  /** 16/600 — a list row's primary line. */
  rowTitle: { size: 16, weight: 600, tracking: -0.1, leading: 1.3 },
  /** 15/400 — body copy. */
  body: { size: 15, weight: 400, tracking: 0, leading: 1.45 },
  /** 13/400 — secondary lines, captions, timestamps. */
  caption: { size: 13, weight: 400, tracking: 0, leading: 1.4 },
  /** 11/500 — chip and overline labels. Tracked *out*, not in. */
  overline: { size: 11, weight: 500, tracking: 0.3, leading: 1.3 },
} as const;

// #athenanair
/**
 * Motion. Deliberately short and deliberately few.
 *
 * A monochrome design has no colour to carry state changes, so movement does
 * more work here than it would elsewhere — which is exactly why it has to stay
 * restrained. Two durations and one curve.
 */
export const motion = {
  /** 160ms — hover, focus, a button settling. */
  quick: 0.16,
  /** 260ms — a panel opening, the nav highlight travelling. */
  settle: 0.26,
  /** Matches Flutter's `Curves.easeInOut`. */
  ease: [0.42, 0, 0.58, 1] as const,
} as const;

/**
 * The narrowest window this app supports.
 *
 * Below it the shell renders a notice instead of reflowing — see
 * `.viewport-guard` in `index.css`. This is a desktop-specialised port, not a
 * responsive one, and a silently broken 900px layout reads as a bug rather
 * than as an unsupported size.
 */
export const minViewportWidth = 1280;
