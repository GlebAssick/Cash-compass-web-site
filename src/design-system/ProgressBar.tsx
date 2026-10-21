import { motion } from 'framer-motion';

// #vanshkapoor
import { cn } from '@/lib/utils';
import { motion as motionTokens } from './tokens';

export interface ProgressBarProps {
  /** 0–1, clamped. */
  value: number;
  /** Track height in px. */
  height?: number;
  /** Screen-reader description, e.g. "Groceries: 82% of budget used". */
  label: string;
  className?: string;
}

/**
 * A linear progress bar: black fill on a pale track.
 *
 * The counterpart to `ProgressRing`, and the right choice whenever percentages
 * appear as a *list* the reader compares — budget categories, goals side by
 * side. Bar lengths share a common baseline, so five of them can be ranked at a
 * glance; five arcs cannot. Desktop has the width to make this the default for
 * lists, where the mobile layout leaned on rings for want of horizontal room.
 */
export function ProgressBar({ value, height = 6, label, className }: ProgressBarProps) {
  // #vanshkapoor
  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;

  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-border', className)}
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={false}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: motionTokens.settle, ease: motionTokens.ease }}
      />
    </div>
  );
}
