import { motion, useReducedMotion } from "framer-motion";
import { colors, motion as motionTokens } from "@/design-system";
import { useGreeting, useTodayLabel } from "@/lib/greeting";
import { useAuth, displayName } from "@/context/AuthContext";

// #kintanjain
/** A four-point star — the shape the ✨ emoji is built from, drawn in ink. */
const SPARKLE_PATH =
  "M12 0C12.6 6.6 17.4 11.4 24 12C17.4 12.6 12.6 17.4 12 24C11.4 17.4 6.6 12.6 0 12C6.6 11.4 11.4 6.6 12 0Z";

/**
The three stars of the cluster, laid out like ✨: one large, two small.
`twinkleEvery` is staggered so the stars never pulse in unison — three
synchronised pulses read as a loading indicator rather than as sparkle.
*/
const SPARKLES = [
  { size: 22, left: 0, top: 12, delay: 0.3, twinkleEvery: 4.2 },
  { size: 12, left: 21, top: 1, delay: 0.45, twinkleEvery: 5.6 },
  { size: 9, left: 27, top: 25, delay: 0.6, twinkleEvery: 7.1 },
] as const;

/**
The shine that sweeps across the greeting once per load.
Ink and hairline come from CSS variables so dark themes can flip them;
the design-system constants are the fallback for the default theme.
Without this the clipped-text gradient stayed black and the greeting
vanished on dark backgrounds.
*/
const SHINE = `linear-gradient(110deg, var(--ink, ${colors.ink}) 0%, var(--ink, ${colors.ink}) 42%, var(--hairline, ${colors.hairline}) 50%, var(--ink, ${colors.ink}) 58%, var(--ink, ${colors.ink}) 100%)`;

/**
The dashboard greeting: time-of-day text, a sparkle cluster, and the date.

Stable identity: the animated elements carry NO `key` tied to the greeting
text. An earlier version keyed them by the greeting so the entrance animation
would replay when morning turned to afternoon — but any language switch also
changed the text, hence the key, hence a full remount; under rapid language
changes that remounting left duplicated headers on screen. The entrance now
plays once per mount and language changes simply swap the text in place.
With reduced motion requested, all of it renders static.
*/
export const GreetingHeader = () => {
  const greeting = useGreeting();
  const today = useTodayLabel();
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const name = displayName(user);
  const greetingText = name ? `${greeting}, ${name}` : greeting;

  if (reduceMotion) {
    return (
      <header>
        <div className="flex items-end gap-3">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">{greetingText}</h1>
          <SparkleCluster animate={false} />
        </div>
        <div className="mt-2 h-[3px] w-10 rounded-full bg-primary" aria-hidden="true" />
        {/* #athenanair */}
        <p className="mt-2 text-sm text-muted-foreground">{today}</p>
      </header>
    );
  }

  return (
    <header>
      <div className="flex items-end gap-3">
        {/* #vanshkapoor */}
        <motion.h1
          className="bg-clip-text font-heading text-3xl font-extrabold tracking-tight text-transparent forced-colors:bg-none forced-colors:text-[CanvasText]"
          style={{ backgroundImage: SHINE, backgroundSize: "250% 100%" }}
          initial={{ opacity: 0, y: 14, scale: 0.92, backgroundPosition: "100% 0%" }}
          animate={{ opacity: 1, y: 0, scale: 1, backgroundPosition: "0% 0%" }}
          transition={{
            duration: 0.6,
            ease: motionTokens.ease,
            backgroundPosition: { duration: 1.1, delay: 0.45, ease: "easeInOut" },
          }}
        >
          {greetingText}
        </motion.h1>
        <SparkleCluster animate />
      </div>
      <motion.div
        aria-hidden="true"
        className="mt-2 h-[3px] w-10 origin-left rounded-full bg-primary"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.35, ease: motionTokens.ease }}
      />
      <motion.p
        className="mt-2 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.55 }}
      >
        {today}
      </motion.p>
    </header>
  );
};

/** The ink ✨. Decorative — hidden from assistive technology. */
const SparkleCluster = ({ animate }: { animate: boolean }) => (
  <span aria-hidden="true" className="relative mb-1 inline-block h-9 w-9 shrink-0">
    {SPARKLES.map((star, index) =>
      animate ? (
        <motion.span
          key={index}
          className="absolute"
          style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
          initial={{ scale: 0, rotate: -60, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.55, delay: star.delay, ease: motionTokens.ease }}
        >
          {/* Inner element owns the idle twinkle, so it cannot fight the
              entrance animation on the outer one for the same transform. */}
          <motion.svg
            viewBox="0 0 24 24"
            width={star.size}
            height={star.size}
            animate={{ scale: [1, 0.55, 1], rotate: [0, 25, 0] }}
            transition={{
              duration: 0.9,
              ease: "easeInOut",
              delay: star.delay + 0.9,
              repeat: Infinity,
              repeatDelay: star.twinkleEvery,
            }}
          >
            <path d={SPARKLE_PATH} fill="var(--ink, #09090b)" />
          </motion.svg>
        </motion.span>
      ) : (
        <svg
          key={index}
          viewBox="0 0 24 24"
          width={star.size}
          height={star.size}
          className="absolute"
          style={{ left: star.left, top: star.top }}
        >
          <path d={SPARKLE_PATH} fill="var(--ink, #09090b)" />
        </svg>
      ),
    )}
  </span>
);