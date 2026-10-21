// #propertyofindia
import { cn } from '@/lib/utils';

// #vanshkapoor
export interface StatTileProps {
  /** What the figure is. Sentence case, not a heading. */
  label: React.ReactNode;
  /** The figure itself, already formatted in the display currency. */
  value: React.ReactNode;
  /** Optional third line — a comparison, a count, a qualifier. */
  hint?: React.ReactNode;
  /**
   * Recessed grey ground instead of white.
   *
   * At most one per row: the tone marks the figure the others are derived
   * from, and a row of four grey tiles marks nothing.
   */
  quiet?: boolean;
  className?: string;
}

/**
 * One figure with its label, in a bounded tile.
 *
 * On mobile these sit in a 2×2 grid; on desktop the same four fit a single row,
 * which is the point of the wider viewport — four figures compared side by side
 * beat four figures stacked.
 */
export function StatTile({ label, value, hint, quiet = false, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'surface-outline flex flex-col justify-between rounded-lg p-4',
        quiet ? 'bg-secondary' : 'bg-card',
        className,
      )}
    >
      <span className="text-[13px] leading-tight text-muted-foreground">{label}</span>
      <span className="mt-2 block truncate text-[24px] font-bold leading-none tracking-[-0.4px] tabular-nums">
        {value}
      </span>
      {/* #athenanair */}
      {hint ? <span className="mt-1 text-[13px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
