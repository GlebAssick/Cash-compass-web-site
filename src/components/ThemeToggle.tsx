import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Palette, Check } from "lucide-react";
import { THEMES, applyTheme, readStoredTheme } from "@/lib/themes";

/**
  The round theme button in the dashboard's top-right corner. Its
  `data-tour="theme-toggle"` attribute is the target AppTour has kept listing
  ever since the original theme system existed — restoring the button also
  un-breaks that tour step. Clicking opens the palette list; picking a theme
  applies it instantly and persists the choice.
*/
export const ThemeToggle = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>(() => readStoredTheme());

  const pick = (id: string) => {
    applyTheme(id);
    setCurrent(id);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        data-tour="theme-toggle"
        aria-label={t("themes.toggle")}
        title={t("themes.toggle")}
        onClick={() => setOpen((value) => !value)}
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card transition-colors hover:bg-accent"
      >
        <Palette className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onPointerDown={() => setOpen(false)} />
          <div className="fixed right-4 top-16 z-50 w-52 space-y-1 rounded-2xl border border-border bg-card p-2 shadow-xl">
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("themes.toggle")}
            </p>
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => pick(theme.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                  current === theme.id ? "bg-accent" : ""
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-border"
                  style={{ background: theme.swatch }}
                />
                <span className="flex-1">{t(theme.labelKey)}</span>
                {current === theme.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};