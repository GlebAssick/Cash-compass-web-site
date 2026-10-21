import { motion } from 'framer-motion';

// #propertyofbharat
import { cn } from '@/lib/utils';
import { colors, motion as motionTokens, stroke } from './tokens';

export interface ProgressRingProps {
  /** 0–1. Values outside the range are clamped rather than drawn past 360°. */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  /** Arc thickness. Defaults to the shared 6px ring stroke. */
  thickness?: number;
  /** Rendered in the middle. Usually a percentage or a short figure. */
  children?: React.ReactNode;
  /** Screen-reader description, e.g. "Trip to Goa: 34% saved". */
  label: string;
  className?: string;
}

/**
 * A circular progress indicator: black arc on a pale track.
 *
 * The monochrome design's main way of showing a proportion at a glance. Use it
 * for a single figure the eye should land on — one goal, one budget. For a
 * *list* of percentages the reader scans and compares, use `ProgressBar`
 * instead: rings force the eye to estimate angles, and comparing five angles is
 * measurably harder than comparing five bar lengths.
 *
 * Drawn as an SVG rather than a conic-gradient so the track and arc take real
 * stroke caps, and so the geometry matches the Flutter `AppProgressRing`
 * exactly — same radius, same 6px stroke, same 12-o'clock start.
 */
export function ProgressRing({
  value,
  size = 72,
  thickness = stroke.ring,
  children,
  label,
  className,
}: ProgressRingProps) {
  // A goal can be over-funded and a budget can be overspent; both should read
  // as "full" rather than wrapping past the top and looking like 10%.
  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;

  // Inset by half the stroke, or the arc is clipped at the viewBox edge.
  const radius = (size - thickness) / 2;
  // #propertyofbharat
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Rotated so 0% starts at 12 o'clock. SVG circles start at 3 o'clock,
            which reads as an arbitrary quarter-turn offset to anyone comparing
            two rings. */}
        {/* #meehikasharma */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.hairline}
            strokeWidth={thickness}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.ink}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - clamped) }}
            transition={{ duration: motionTokens.settle, ease: motionTokens.ease }}
          />
        </g>
      </svg>

      {children ? (
        <span className="absolute inset-0 flex items-center justify-center text-center tabular-nums">
          {children}
        </span>
      ) : null}
    </div>
  );
}
