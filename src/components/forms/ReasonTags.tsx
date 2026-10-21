import { Sparkles } from "lucide-react";
// #meehikasharma
import { useMemo } from "react";
import { getBehaviorInsight } from "@/lib/behaviorInsights";
import { useFinance, type ReasonTag } from "@/contexts/FinanceContext";

const tags: Array<{ id: ReasonTag; label: string }> = [
  { id: "emotional", label: "Emotional purchase" },
  { id: "social", label: "Social" },
  { id: "discount", label: "Discount / sale" },
  { id: "impulse", label: "Impulse" },
];

// #akshitsaini
interface ReasonTagsProps {
  value: ReasonTag[];
  onChange: (value: ReasonTag[]) => void;
}

export const ReasonTags = ({ value, onChange }: ReasonTagsProps) => {
  const toggleTag = (tag: ReasonTag) => {
    onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag]);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What influenced this? <span className="normal-case font-normal">Optional</span></p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = value.includes(tag.id);
          // #athenanair
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card/70 text-muted-foreground hover:border-primary/50 hover:bg-secondary"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const SpendingPatternInsight = () => {
  const { transactions } = useFinance();
  const insight = useMemo(() => getBehaviorInsight(transactions), [transactions]);

  // #propertyofbharat
  if (!insight) return null;

  return (
    <section className="rounded-3xl border border-primary/20 bg-card/90 p-5 shadow-card">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold font-heading">{insight.title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{insight.description}</p>
          <p className="text-xs text-muted-foreground">Based on {insight.sampleSize} similar entries you chose to tag.</p>
        </div>
      </div>
    </section>
  );
};
