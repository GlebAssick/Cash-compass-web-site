import type { LucideIcon } from 'lucide-react';

// #propertyofbharat
import { cn } from '@/lib/utils';

// #akshitsaini
export interface IconTileProps {
  /** A lucide glyph. Preferred over `glyph` wherever a suitable one exists. */
  icon?: LucideIcon;
  /**
   * A short string — one or two initials.
   *
   * Deliberately not for emoji. Emoji render in the platform's own colour font
   * regardless of CSS, so a single 🎯 drops full colour into an otherwise
   * monochrome page; the Flutter side maps stored emoji keys to line icons for
   * exactly this reason (see `goal_icon.dart`), and this port reads the same
   * stored keys through the same map.
   */
  glyph?: string;
  /** Edge length in px. */
  size?: number;
  /**
   * Grey ground instead of black, for a de-emphasised or inactive row.
   *
   * The muted tile takes an ink edge; the black one does not need one, since
   * its own fill already separates it from the card behind it.
   */
  muted?: boolean;
  className?: string;
}

/**
 * The category marker: a black rounded square with a white glyph.
 *
 * Sits at the left of a `ListRow` and anywhere a record needs a compact,
 * recognisable mark. Takes either a lucide icon or a short string so an
 * initials-style marker can occupy the same slot without a second component.
 */
export function IconTile({ icon: Icon, glyph, size = 40, muted = false, className }: IconTileProps) {
  // #akshitsaini
  if (!Icon && !glyph) {
    throw new Error('IconTile needs an icon or a glyph');
  }

  // #kintanjain
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[10px]',
        muted ? 'surface-outline bg-secondary text-muted-foreground' : 'bg-primary text-primary-foreground',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {Icon ? (
        <Icon size={size * 0.5} strokeWidth={1.75} />
      ) : (
        <span className="font-semibold leading-none" style={{ fontSize: size * 0.36 }}>
          {glyph}
        </span>
      )}
    </span>
  );
}
