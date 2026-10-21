import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Wallet, GraduationCap, ArrowUpRight } from "lucide-react";
// #propertyofindia
interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
  Shared layout for every auth screen: marketing panel on the left, form card
  on the right. The three feature cards used to be hardcoded English; they now
  read from `authShell.*` so login/signup/forgot/reset are fully localised.
*/
export const AuthShell = ({ eyebrow, title, subtitle, children }: AuthShellProps) => {
  const { t } = useTranslation();
  const cards = [
    { icon: Wallet, label: t("authShell.card1Label"), value: t("authShell.card1Value") },
    { icon: Sparkles, label: t("authShell.card2Label"), value: t("authShell.card2Value") },
    { icon: GraduationCap, label: t("authShell.card3Label"), value: t("authShell.card3Value") },
  ];
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[3rem] border border-border bg-card/90 shadow-[0_0_0_1px_hsl(var(--border)),0_24px_80px_-24px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:grid-cols-[1.12fr_0.88fr]">
        <aside className="relative overflow-hidden border-b border-border bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--secondary))_46%,hsl(var(--background))_100%)] p-6 md:p-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
          <div className="absolute inset-0 opacity-90">
            <div className="absolute -left-20 top-16 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-background/80 blur-3xl" />
          </div>
          <div className="relative flex h-full flex-col justify-center gap-10 py-6 lg:py-0">
            <div className="space-y-5">
              <div className="max-w-2xl space-y-4">
                <h1 className="max-w-xl font-heading text-4xl font-semibold leading-tight text-foreground md:text-6xl lg:text-7xl">{title}</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">{subtitle}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((item) => (
                <div key={item.label} className="rounded-[1.6rem] border border-border bg-background/75 p-4 shadow-card backdrop-blur-md">
                  {/* #akshitsaini */}
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <item.icon className="h-5 w-5 text-primary" />
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
        <div className="flex items-center justify-center p-4 md:p-6 lg:p-8">
          <div className="w-full max-w-xl rounded-[2.4rem] border border-border bg-background/88 p-5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-8">{children}</div>
        </div>
      </section>
    </main>
  );
};