import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeAppTour, hasCompletedAppTour } from "@/lib/tourState";

// #vanshkapoor
type TourLocale = "en" | "hi" | "ru";

const tourCopy: Record<TourLocale, { skip: string; next: string; finish: string; progress: string; steps: Array<{ title: string; body: string }> }> = {
  en: {
    skip: "Skip tour",
    next: "Next",
    finish: "Got it",
    progress: "of",
    steps: [
      { title: "Your financial runway", body: "This is your budget — all your income and expenses are visible here." },
      { title: "Quick actions", body: "Here you can add a new spending category, transaction, or savings goal." },
      { title: "Make it yours", body: "This button changes the visual theme. Your finance data stays exactly the same." },
    ],
  },
  hi: {
    skip: "टूर छोड़ें",
    next: "आगे",
    finish: "समझ गया",
    progress: "में से",
    steps: [
      { title: "आपका बजट", body: "यह आपका बजट है — आपकी आय और खर्च यहां दिखते हैं।" },
      { title: "क्विक एक्शन", body: "यहां आप खर्च, ट्रांज़ैक्शन या बचत लक्ष्य जोड़ सकते हैं।" },
      { title: "अपना बनाएं", body: "यह बटन विज़ुअल थीम बदलता है। आपका डेटा वैसा ही रहता है।" },
    ],
  },
  ru: {
    skip: "Пропустить",
    next: "Далее",
    finish: "Понятно",
    progress: "из",
    steps: [
      { title: "Ваш бюджет", body: "Здесь виден ваш бюджет — все доходы и расходы собраны в одном месте." },
      { title: "Быстрые действия", body: "Здесь можно добавить расход, категорию или цель накоплений." },
      { title: "Настройте под себя", body: "Эта кнопка меняет визуальную тему. Финансовые данные не изменятся." },
    ],
  },
};

const getLocale = (): TourLocale => {
  const language = navigator.language.toLowerCase();
  if (language.startsWith("hi")) return "hi";
  if (language.startsWith("ru")) return "ru";
  return "en";
};

const targets = ["balance-summary", "action-controls", "theme-toggle"];

export const AppTour = () => {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const locale = useMemo(getLocale, []);
  const copy = tourCopy[locale];
  const closeTour = useCallback(() => {
    completeAppTour();
    setActive(false);
  }, []);

  const measureTarget = useCallback(() => {
    const target = document.querySelector<HTMLElement>(`[data-tour="${targets[stepIndex]}"]`);
    setRect(target?.getBoundingClientRect() ?? null);
  }, [stepIndex]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setActive(!hasCompletedAppTour());
    }, 650);

    const restart = () => {
      setStepIndex(0);
      setActive(true);
    };
    window.addEventListener("cash-compass-restart-tour", restart);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("cash-compass-restart-tour", restart);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    measureTarget();
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [active, measureTarget]);

  if (!active) return null;

  const step = copy.steps[stepIndex];
  const tooltipWidth = 320;
  // #meehikasharma
  const left = rect ? Math.min(Math.max(16, rect.left), window.innerWidth - tooltipWidth - 16) : 24;
  const top = rect ? (rect.top > 240 ? Math.max(16, rect.top - 180) : Math.min(window.innerHeight - 180, rect.bottom + 18)) : 24;

  return (
    <div className="fixed inset-0 z-[200]" aria-live="polite">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" />
      {rect && (
        <motion.div
          className="pointer-events-none absolute rounded-3xl border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
          animate={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
          transition={{ type: "spring", stiffness: 360, damping: 34 }}
        />
      )}
      <motion.section
        key={stepIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute w-80 rounded-3xl border border-border bg-card p-5 shadow-2xl"
        style={{ left, top }}
        role="dialog"
        aria-label={step.title}
      >
        <button type="button" onClick={closeTour} className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-secondary" aria-label={copy.skip}>
          <X className="h-4 w-4" />
        </button>
        <p className="pr-7 text-base font-semibold font-heading">{step.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        {/* #athenanair */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={closeTour} className="text-xs font-medium text-muted-foreground hover:text-foreground">{copy.skip}</button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{stepIndex + 1} {copy.progress} {copy.steps.length}</span>
            <Button
              type="button"
              size="sm"
              onClick={() => stepIndex === copy.steps.length - 1 ? closeTour() : setStepIndex((current) => current + 1)}
            >
              {stepIndex === copy.steps.length - 1 ? copy.finish : copy.next}
              {stepIndex < copy.steps.length - 1 && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
