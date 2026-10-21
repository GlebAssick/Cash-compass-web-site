import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Plus, RectangleHorizontal, Trash2, Settings, TrendingUp, AlertTriangle, Users, Sparkles, Zap, MessageCircle, Flame, CalendarClock, Target } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useFinance } from "@/contexts/FinanceContext";
import { MIN_CHARGES, detectSubscriptions } from "@/lib/subscriptions";
import { budgetUsage } from "@/lib/budgets";
import { averageGoalPercent, goalPercent } from "@/lib/goals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "@/components/ui/use-toast";

type WidgetType =
  | "budget-health"
  | "top-categories"
  | "today-snapshot"
  | "goal-progress"
  | "media"
  | "safe-to-spend"
  | "sub-stash-jar"
  | "burn-rate-line"
  | "waste-auditor"
  | "roommate-sync"
  | "manga-status"
  | "ascii-fortune"
  | "chibi-mascot"
  | "quick-entry-pad"
  | "3d-growth-gem"
  | "upcoming-bills"
  | "tracking-streak"
  | "category-budget-ring";

interface WorkspaceWidget {
  id: string;
  type: WidgetType;
  colSpan: number;
  rowSpan: number;
  mediaDataUrl?: string;
}

interface ResizeState {
  id: string;
  startX: number;
  startY: number;
  startColSpan: number;
  startRowSpan: number;
}

const STORAGE_KEY = "cash-compass-workspace-v3";
const GRID_COLUMNS = 12;
const GRID_GAP_PX = 16;
const GRID_ROW_PX = 96;

const defaultSpan: Record<WidgetType, { col: number; row: number }> = {
  "today-snapshot": { col: 3, row: 2 },
  "budget-health": { col: 3, row: 2 },
  "top-categories": { col: 3, row: 2 },
  "goal-progress": { col: 3, row: 2 },
  media: { col: 3, row: 2 },
  "safe-to-spend": { col: 3, row: 2 },
  "sub-stash-jar": { col: 3, row: 2 },
  "burn-rate-line": { col: 3, row: 2 },
  "waste-auditor": { col: 3, row: 2 },
  "roommate-sync": { col: 3, row: 2 },
  "manga-status": { col: 3, row: 2 },
  "ascii-fortune": { col: 3, row: 2 },
  "chibi-mascot": { col: 3, row: 2 },
  "quick-entry-pad": { col: 3, row: 2 },
  "3d-growth-gem": { col: 3, row: 2 },
  "upcoming-bills": { col: 3, row: 2 },
  "tracking-streak": { col: 3, row: 2 },
  "category-budget-ring": { col: 3, row: 2 },
};

/**
 * One-tap sizes in the widget settings menu. The four cover the shapes a
 * dashboard actually wants: a tile, the default card, a half-width chart,
 * and a half-width block with room for a list. The free resize handle
 * still allows anything between 2×1 and 12×6.
 */
const SIZE_PRESETS: Array<{ key: string; labelKey: string; col: number; row: number }> = [
  { key: "small", labelKey: "workspaceCanvas.sizeSmall", col: 2, row: 2 },
  { key: "medium", labelKey: "workspaceCanvas.sizeMedium", col: 3, row: 2 },
  { key: "wide", labelKey: "workspaceCanvas.sizeWide", col: 6, row: 2 },
  { key: "large", labelKey: "workspaceCanvas.sizeLarge", col: 6, row: 4 },
];

// #akshitsaini
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// #propertyofindia
const WidgetShell = ({
  children,
  isDragging,
}: {
  children: React.ReactNode;
  isDragging?: boolean;
}) => (
  <div
    className={`h-full w-full rounded-2xl border border-white/35 bg-white/15 p-4 backdrop-blur-xl transition-all duration-300 ${
      isDragging ? "shadow-2xl ring-2 ring-primary/40" : "shadow-lg"
    }`}
  >
    {children}
  </div>
);

const WidgetPreview = ({ widget, content }: { widget: WorkspaceWidget; content: React.ReactNode }) => (
  <div
    style={{
      gridColumn: `span ${widget.colSpan} / span ${widget.colSpan}`,
      gridRow: `span ${widget.rowSpan} / span ${widget.rowSpan}`,
    }}
    className="h-full"
  >
    <WidgetShell isDragging>{content}</WidgetShell>
  </div>
);

const SortableWidget = ({
  widget,
  content,
  menuOpen,
  onRemove,
  onResizeStart,
  onUploadMedia,
  onToggleSettings,
  onApplySize,
  onDuplicate,
}: {
  widget: WorkspaceWidget;
  content: React.ReactNode;
  menuOpen: boolean;
  onRemove: (id: string) => void;
  onResizeStart: (widget: WorkspaceWidget, event: React.MouseEvent<HTMLButtonElement>) => void;
  onUploadMedia: (id: string, file: File | null) => void;
  onToggleSettings: (id: string) => void;
  onApplySize: (id: string, col: number, row: number) => void;
  onDuplicate: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });
  const mediaInputId = `workspace-media-${widget.id}`;
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? "transform 250ms cubic-bezier(0.25, 1, 0.5, 1)",
    gridColumn: `span ${widget.colSpan} / span ${widget.colSpan}`,
    gridRow: `span ${widget.rowSpan} / span ${widget.rowSpan}`,
    // A widget with its settings menu open must sit above the
    // click-away overlay; a dragging one above everything else.
    zIndex: isDragging ? 40 : menuOpen ? 30 : 1,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative min-h-[120px]">
      <WidgetShell isDragging={isDragging}>
        {widget.type !== "media" && (
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GripVertical className="h-4 w-4 text-muted-foreground" {...attributes} {...listeners} />
              {t(`workspaceCanvas.widgets.${widget.type}`)}
            </div>
            <Badge variant="secondary">{widget.colSpan}x{widget.rowSpan}</Badge>
          </div>
        )}
        {widget.type === "media" ? (
          <div className="relative h-full min-h-[130px] overflow-hidden rounded-xl border border-white/35 bg-white/10">
            <label
              htmlFor={mediaInputId}
              className="absolute left-2 top-2 z-20 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/35 bg-black/25 text-white backdrop-blur"
              title={t("workspaceCanvas.uploadImage")}
            >
              <ImagePlus className="h-4 w-4" />
            </label>
            <input
              id={mediaInputId}
              className="hidden"
              type="file"
              accept="image/*,.gif"
              onChange={(event) => onUploadMedia(widget.id, event.target.files?.[0] ?? null)}
            />
            {widget.mediaDataUrl ? (
              <img src={widget.mediaDataUrl} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-white/25 to-white/5" />
            )}
          </div>
        ) : (
          <div className="h-[calc(100%-2rem)] rounded-xl border border-white/25 bg-white/10 p-3">
            {content}
          </div>
        )}
      </WidgetShell>
      <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
        {widget.type === "media" && (
          <div className="rounded-md border border-white/40 bg-black/25 p-1 text-white" {...attributes} {...listeners}>
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleSettings(widget.id)}
          className={`rounded-md border border-white/35 bg-black/20 p-1 text-white backdrop-blur transition-colors hover:bg-black/35 ${
            menuOpen ? "ring-2 ring-primary/50" : ""
          }`}
          aria-label={t("workspaceCanvas.widgetSettings")}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(widget.id)}
          className="rounded-md border border-white/35 bg-black/20 p-1 text-white backdrop-blur transition-colors hover:bg-black/35"
          aria-label={t("workspaceCanvas.removeWidget")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => onResizeStart(widget, event)}
          className="rounded-md border border-white/35 bg-black/25 p-1 text-white backdrop-blur transition-colors hover:bg-black/35"
          aria-label={t("workspaceCanvas.resizeWidget")}
        >
          <RectangleHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
      {menuOpen && (
        <div className="absolute bottom-9 right-2 z-40 w-44 space-y-2 rounded-xl border border-border bg-card p-2 shadow-xl">
          <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("workspaceCanvas.sizePresets")}
          </p>
          <div className="grid grid-cols-2 gap-1">
            {SIZE_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                size="sm"
                variant={widget.colSpan === preset.col && widget.rowSpan === preset.row ? "secondary" : "ghost"}
                className="h-6 px-1 text-[11px]"
                onClick={() => onApplySize(widget.id, preset.col, preset.row)}
              >
                {t(preset.labelKey)}
              </Button>
            ))}
          </div>
          <div className="space-y-1 border-t border-border pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-full justify-start text-xs"
              onClick={() => onDuplicate(widget.id)}
            >
              {t("workspaceCanvas.duplicateWidget")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-full justify-start text-xs text-destructive"
              onClick={() => onRemove(widget.id)}
            >
              {t("workspaceCanvas.removeWidget")}
            </Button>
          </div>
        </div>
      )}
      {isDragging && <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-primary/60" />}
    </div>
  );
};

export const WorkspaceCanvas = () => {
  const { t, i18n } = useTranslation();
  const { formatFromUSD, convertToUSD } = useCurrency();
  const { transactions, budgets, goals, manualBalance, addTransaction, contributeToGoal } = useFinance();
  const dateLocale = i18n.language?.startsWith("ru")
    ? "ru-RU"
    : i18n.language?.startsWith("hi")
      ? "hi-IN"
      : "en-US";
  const [widgets, setWidgets] = useState<WorkspaceWidget[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as WorkspaceWidget[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [showAllWidgets, setShowAllWidgets] = useState(false);
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    if (!resizeState) return;
    const onMove = (event: MouseEvent) => {
      const gridWidth = Math.max(600, gridRef.current?.clientWidth ?? 600);
      const usableWidth = gridWidth - GRID_GAP_PX * (GRID_COLUMNS - 1);
      const colUnit = usableWidth / GRID_COLUMNS;
      const colStep = colUnit + GRID_GAP_PX;
      const rowStep = GRID_ROW_PX + GRID_GAP_PX;
      const deltaX = event.clientX - resizeState.startX;
      const deltaY = event.clientY - resizeState.startY;
      const nextColSpan = clamp(resizeState.startColSpan + Math.round(deltaX / colStep), 2, GRID_COLUMNS);
      const nextRowSpan = clamp(resizeState.startRowSpan + Math.round(deltaY / rowStep), 1, 6);
      setWidgets((prev) =>
        prev.map((widget) =>
          widget.id === resizeState.id
            ? { ...widget, colSpan: nextColSpan, rowSpan: nextRowSpan }
            : widget,
        ),
      );
    };
    const onUp = () => setResizeState(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizeState]);

  const expenseByCategory = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === "expense")
      .reduce<Record<string, number>>((acc, tx) => {
        acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount;
        return acc;
      }, {});
  }, [transactions]);

  /** Month-scoped budget usage, keyed by category name. */
  const usageByName = useMemo(
    () => new Map(budgetUsage(budgets, transactions).map((u) => [u.name, u])),
    [budgets, transactions],
  );

  const spentTodayFromEntries = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return transactions
      .filter((tx) => tx.type === "expense" && tx.date === today)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const totalSpentFromEntries = useMemo(
    () => transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0),
    [transactions],
  );

  // Days in a row (ending today or yesterday) with at least one logged
  // transaction — mirrors the streak calculation used in the personal
  // cabinet so the two stay consistent.
  const trackingStreak = useMemo(() => {
    const uniqueDates = Array.from(new Set(transactions.map((tx) => tx.date))).sort((a, b) => b.localeCompare(a));
    if (uniqueDates.length === 0) return 0;
    let streak = 0;
    const cursor = new Date();
    for (;;) {
      const iso = cursor.toISOString().slice(0, 10);
      if (uniqueDates.includes(iso)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [transactions]);

  const addWidget = (type: WidgetType, mediaDataUrl?: string) => {
    const span = defaultSpan[type];
    setWidgets((prev) => [
      ...prev,
      {
        id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        colSpan: span.col,
        rowSpan: span.row,
        mediaDataUrl,
      },
    ]);
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== id));
    setMenuForId((prev) => (prev === id ? null : prev));
  };

  const duplicateWidget = (id: string) => {
    setWidgets((prev) => {
      const source = prev.find((widget) => widget.id === id);
      if (!source) return prev;
      return [
        ...prev,
        { ...source, id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
      ];
    });
    setMenuForId(null);
  };

  const applyWidgetSize = (id: string, col: number, row: number) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === id
          ? { ...widget, colSpan: clamp(col, 2, GRID_COLUMNS), rowSpan: clamp(row, 1, 6) }
          : widget,
      ),
    );
  };

  const toggleWidgetMenu = (id: string) => {
    setMenuForId((prev) => (prev === id ? null : id));
  };

  const updateWidgetMedia = (id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
      if (!dataUrl) return;
      setWidgets((prev) => prev.map((widget) => (widget.id === id ? { ...widget, mediaDataUrl: dataUrl } : widget)));
    };
    reader.readAsDataURL(file);
  };

  const handleAddMediaWidget = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
      addWidget("media", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onDragStart = (event: DragStartEvent) => {
    setMenuForId(null);
    setActiveId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setWidgets((prev) => {
      const oldIndex = prev.findIndex((widget) => widget.id === active.id);
      const newIndex = prev.findIndex((widget) => widget.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const activeWidget = widgets.find((widget) => widget.id === activeId) ?? null;

  const renderWidgetContainer = (widget: WorkspaceWidget) => {
    // Original widgets
    if (widget.type === "today-snapshot") {
      return <p className="text-sm text-muted-foreground">{t("workspaceCanvas.spentTodayLabel")} {formatFromUSD(spentTodayFromEntries)}</p>;
    }
    if (widget.type === "budget-health") {
      return (
        <div className="space-y-2 text-sm">
          {budgets.slice(0, 3).map((budget) => {
            // Month-scoped, via the shared helper. This used to divide
            // all-time category spend by a *monthly* limit, so a long-running
            // budget reported several hundred percent while the Insight Box,
            // which scoped correctly, reported the real figure.
            const usage = usageByName.get(budget.name);
            const ratio = (usage?.ratio ?? 0) * 100;
            return (
              <div key={budget.id} className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 p-2">
                <span>{budget.name}</span>
                <Badge variant="secondary">{ratio.toFixed(0)}%</Badge>
              </div>
            );
          })}
        </div>
      );
    }
    if (widget.type === "top-categories") {
      const sorted = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return (
        <div className="space-y-2 text-sm">
          {sorted.map(([name, value]) => (
            <div key={name} className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 p-2">
              <span>{name}</span>
              <span>{formatFromUSD(value)}</span>
            </div>
          ))}
        </div>
      );
    }
    if (widget.type === "goal-progress") {
      return (
        <div className="space-y-2 text-sm">
          {goals.slice(0, 3).map((goal) => {
            const pct = goalPercent(goal);
            return (
              <div key={goal.id} className="rounded-lg border border-white/20 bg-white/10 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span>{goal.name}</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/20">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    // New widgets
    if (widget.type === "safe-to-spend") {
      const starting = manualBalance ?? 0;
      const available = Math.max(0, starting - totalSpentFromEntries);
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
      const dailyBudget = available / daysRemaining;
      const safeToSpend = Math.max(0, dailyBudget - spentTodayFromEntries);
      const completion = dailyBudget > 0 ? (safeToSpend / dailyBudget) * 100 : 0;
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className="relative w-20 h-20 rounded-full border-4 border-green-400/40 bg-green-400/10 flex items-center justify-center">
            <svg className="w-16 h-16" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(34,197,94,0.2)" strokeWidth="2" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
                strokeDasharray={`${(completion / 100) * 283} 283`}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "all 0.3s" }}
              />
            </svg>
            <span className="absolute text-xs font-bold text-green-400">{completion.toFixed(0)}%</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("workspaceCanvas.safeToSpend")}</p>
            <p className="text-sm font-bold">{formatFromUSD(safeToSpend)}</p>
          </div>
        </div>
      );
    }
        if (widget.type === "sub-stash-jar") {
      const totalSavings = goals.reduce((sum, goal) => sum + goal.current, 0);
      const targetGoal = goals[0];
      const boostInputId = `boost-${widget.id}`;
      return (
        <div className="flex flex-col items-center justify-between h-full">
          <div className="text-xs text-muted-foreground font-semibold">{t("workspaceCanvas.widgets.sub-stash-jar")}</div>
          <div className="relative w-12 h-20 border-2 border-amber-400/60 rounded-b-2xl rounded-t-md bg-amber-400/20 overflow-hidden flex items-center justify-center">
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-400 to-amber-300 transition-all duration-500"
              style={{ height: `${Math.min(100, (totalSavings / 5000) * 100)}%` }}
            />
            <span className="absolute text-xs font-bold text-amber-900 z-10">{Math.floor(totalSavings / 100)}</span>
          </div>
          {targetGoal ? (
            <>
              <input
                id={boostInputId}
                type="number"
                min="0"
                step="0.01"
                placeholder={t("workspaceCanvas.amount")}
                className="mt-2 w-full rounded border border-white/20 bg-white/10 px-2 py-1 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1 h-7 w-full text-xs"
                onClick={() => {
                  const input = document.getElementById(boostInputId) as HTMLInputElement | null;
                  const value = Number(input?.value);
                  if (!Number.isFinite(value) || value <= 0) return;
                  contributeToGoal(targetGoal.id, convertToUSD(value));
                  toast({
                    title: t("workspaceCanvas.widgets.sub-stash-jar"),
                    description: `+${formatFromUSD(convertToUSD(value))} → ${targetGoal.name}`,
                  });
                  if (input) input.value = "";
                }}
              >
                {t("workspaceCanvas.boost")}
              </Button>
            </>
          ) : (
            <p className="mt-2 text-center text-xs text-muted-foreground">No goals yet — create a goal to start filling the jar.</p>
          )}
          <div className="text-xs text-muted-foreground mt-1">{formatFromUSD(totalSavings)}</div>
        </div>
      );
    }
    if (widget.type === "burn-rate-line") {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayExpenses = transactions
          .filter((tx) => tx.type === "expense" && new Date(tx.date).toDateString() === date.toDateString())
          .reduce((sum, tx) => sum + tx.amount, 0);
        return { date: date.toLocaleDateString(dateLocale, { month: "short", day: "numeric" }), burn: dayExpenses };
      });
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={last7Days} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.5)" />
            <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.5)" />
            <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)" }} />
            <Line type="monotone" dataKey="burn" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    // #propertyofbharat
    if (widget.type === "waste-auditor") {
      // Reads the user's own history through the shared detector.
      //
      // This widget previously rendered a literal array — Streaming $15.99,
      // Cloud Storage $9.99, Gym $49.99 — for every user regardless of their
      // data, and offered a "✕" that did nothing. It was the most extreme case
      // of the inconsistency this audit was chasing: not a divergent
      // calculation but no calculation at all, presented as a finding.
      //
      // The mobile app's equivalent widget already reads real detected
      // subscriptions; this brings the two into line.
      const subscriptions = detectSubscriptions(transactions);
      if (!subscriptions.length) {
        return (
          <p className="text-xs text-muted-foreground">
            {t("workspaceCanvas.nothingRepeating", { n: MIN_CHARGES })}
          </p>
        );
      }
      return (
        <div className="space-y-2 text-xs">
          {subscriptions.map((sub) => (
            <div key={sub.name} className="surface-outline flex items-center justify-between rounded p-2">
              <div className="flex-1">
                <p className="font-semibold">{sub.name}</p>
                <p className="text-muted-foreground tabular-nums">{formatFromUSD(sub.averageAmount)}{t("workspaceCanvas.perMonth")}</p>
              </div>
              <span className="shrink-0 text-muted-foreground tabular-nums">×{sub.chargeCount}</span>
            </div>
          ))}
        </div>
      );
    }
    if (widget.type === "roommate-sync") {
      const shared = transactions.filter(
          (tx) => (tx.category ?? "").toLowerCase() === "shared",
          );
        if (shared.length === 0) {
          return (
              <p className="text-xs text-muted-foreground">
                No shared expenses yet. Tag a transaction with the “Shared” category to see roommate splits here.
              </p>
            );
          }
        return (
          <div className="space-y-2 h-full overflow-auto text-sm">
            {shared.slice(0, 6).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded border border-blue-400/30 bg-blue-400/10 p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="h-4 w-4 shrink-0 text-blue-300" />
                  <span className="truncate">{tx.name}</span>
                  </div>
                  <span className="tabular-nums">{formatFromUSD(tx.amount)}</span>
                </div>
              ))}
            </div>
          );
        }
    if (widget.type === "manga-status") {
      const totalSavingsPercentage = averageGoalPercent(goals);
      const charStage = Math.floor(totalSavingsPercentage / 25);
      const stageEmoji = ["😔", "😐", "😊", "😄", "🤩"][charStage];
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="text-6xl">{stageEmoji}</div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("workspaceCanvas.savingsProgress")}</p>
            <p className="text-lg font-bold">{totalSavingsPercentage.toFixed(0)}%</p>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-400 to-purple-400" style={{ width: `${totalSavingsPercentage}%` }} />
          </div>
        </div>
      );
    }
    if (widget.type === "ascii-fortune") {
        const dateKey = new Date().toISOString().slice(0, 10);
        let hash = 0;
          for (let i = 0; i < dateKey.length; i++) {
            hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
          }
      const fortuneIndex = hash % 5;
      return (
        <div className="h-full flex items-center justify-center font-mono text-xs leading-relaxed text-center p-2">
          <div className="bg-black/20 p-3 rounded border border-white/20">{t(`workspaceCanvas.fortunes.${fortuneIndex}`)}</div>
        </div>
      );
    }
    if (widget.type === "chibi-mascot") {
      return (
        <div className="flex items-center justify-center h-full cursor-pointer text-4xl hover:scale-110 transition-transform" title={t("workspaceCanvas.mascotHint")}>
          🤖
        </div>
      );
    }
    if (widget.type === "quick-entry-pad") {
      const topCategories = Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
      if (topCategories.length === 0) topCategories.push("Food", "Transport", "Shopping");
      return (
        <div className="space-y-2 h-full">
          <input
            id={`qep-amount-${widget.id}`}
            type="number"
            placeholder={t("workspaceCanvas.amount")}
            min="0"
            step="0.01"
            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
          />
          <div className="space-y-1">
            {/* #akshitsaini */}
            {topCategories.map((cat, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="secondary"
                className="w-full text-xs"
                onClick={() => {
                  const input = document.getElementById(`qep-amount-${widget.id}`) as HTMLInputElement | null;
                  const val = Number(input?.value);
                  if (!val || val <= 0) return;
                  addTransaction({
                    name: cat,
                    amount: convertToUSD(val),
                    type: "expense",
                    category: cat,
                    date: new Date().toISOString().slice(0, 10),
                  });
                  if (input) input.value = "";
                }}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      );
    }
    if (widget.type === "3d-growth-gem") {
      const totalSavings = goals.reduce((sum, goal) => sum + goal.current, 0);
      const gemSize = Math.min(80, 30 + (totalSavings / 10000) * 50);
      return (
        <div className="flex items-center justify-center h-full">
              <svg width={gemSize} height={gemSize} viewBox="0 0 100 100">
              <polygon points="50,10 90,40 90,70 50,90 10,70 10,40" fill={`url(#gemGradient-${widget.id})`} stroke="rgba(168,85,247,0.6)" strokeWidth="2" />
              <defs>
                <linearGradient id={`gemGradient-${widget.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#c084fc", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#7c3aed", stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute text-center">
            <p className="text-xs font-bold">{formatFromUSD(totalSavings)}</p>
          </div>
        </div>
      );
    }
    // New: ties into the same subscription detector as "Waste Auditor",
    // but surfaces it as a countdown instead of a cost audit. Next-charge
    // date isn't part of DetectedSubscription, so it's derived here from
    // lastCharged + averageIntervalDays rather than duplicated upstream.
    if (widget.type === "upcoming-bills") {
      const MS_PER_DAY = 86_400_000;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const withCountdown = detectSubscriptions(transactions).map((sub) => {
        const last = new Date(sub.lastCharged);
        const next = new Date(last.getTime() + sub.averageIntervalDays * MS_PER_DAY);
        const daysUntil = Math.round((next.getTime() - today.getTime()) / MS_PER_DAY);
        return { ...sub, daysUntil };
      });
      const upcoming = withCountdown
        .slice()
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 4);
      if (!upcoming.length) {
        return (
          <p className="text-xs text-muted-foreground">
            {t("workspaceCanvas.noRecurring", { n: MIN_CHARGES })}
          </p>
        );
      }
      return (
        <div className="space-y-2 text-xs">
          {upcoming.map((sub) => (
            <div key={sub.name} className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 p-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{sub.name}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatFromUSD(sub.averageAmount)}</p>
                <p className="text-muted-foreground">
                  {sub.daysUntil <= 0 ? t("workspaceCanvas.dueNow") : `${sub.daysUntil} ${t("workspaceCanvas.daysShort")}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    }
    // New: same streak logic as the personal cabinet, surfaced here so the
    // user sees it while arranging their workspace too.
    if (widget.type === "tracking-streak") {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <div className="flex items-center gap-1.5 text-3xl font-bold">
            <Flame className="h-7 w-7 text-orange-400" />
            {trackingStreak}
          </div>
          <p className="text-xs text-muted-foreground">
            {trackingStreak === 0
              ? t("workspaceCanvas.streakStart")
              : t("workspaceCanvas.streakLabel")}
          </p>
        </div>
      );
    }
    // New: circular progress for a single category's budget usage —
    // more glanceable than the list-style Budget Health widget.
    if (widget.type === "category-budget-ring") {
      const usage = budgetUsage(budgets, transactions)[0];
      if (!usage) {
        return (
          <p className="text-xs text-muted-foreground">
            {t("workspaceCanvas.ringEmpty")}
          </p>
        );
      }
      const pct = Math.min(100, usage.ratio * 100);
      const isOver = usage.ratio > 1;
      const ringColor = isOver ? "#ef4444" : pct > 80 ? "#f97316" : "#22c55e";
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <svg className="h-20 w-20" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={ringColor}
                strokeWidth="6"
                strokeDasharray={`${(pct / 100) * 283} 283`}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "all 0.3s" }}
              />
            </svg>
            <Target className="absolute h-5 w-5" style={{ color: ringColor }} />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold">{usage.name}</p>
            <p className="text-[11px] text-muted-foreground">{pct.toFixed(0)}% {t("workspaceCanvas.ofBudget")}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/35 bg-white/20 p-4 backdrop-blur-xl shadow-lg">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{t("workspaceCanvas.addWidgets")}</p>
              <p className="text-xs text-muted-foreground">{t("workspaceCanvas.addWidgetsHint")}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllWidgets(!showAllWidgets)}
              className="h-7 shrink-0 text-xs"
            >
              {showAllWidgets ? t("workspaceCanvas.showLess") : t("workspaceCanvas.viewAll")}
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("workspaceCanvas.groupCore")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" className="gap-2" onClick={() => addWidget("today-snapshot")}>
                <Plus className="h-4 w-4" />
                {t("workspaceCanvas.btnToday")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => addWidget("budget-health")}>{t("workspaceCanvas.btnBudget")}</Button>
              <Button type="button" variant="secondary" onClick={() => addWidget("top-categories")}>{t("workspaceCanvas.btnCategories")}</Button>
              <Button type="button" variant="secondary" onClick={() => addWidget("goal-progress")}>{t("workspaceCanvas.btnGoals")}</Button>
              <Button type="button" variant="outline" onClick={() => addWidget("safe-to-spend")}>
                <TrendingUp className="h-3.5 w-3.5" />
                {t("workspaceCanvas.btnSafeToSpend")}
              </Button>
              <Button type="button" variant="outline" onClick={() => addWidget("sub-stash-jar")}>
                <Sparkles className="h-3.5 w-3.5" />
                {t("workspaceCanvas.btnSubStash")}
              </Button>
            </div>
          </div>
          {showAllWidgets && (
            <>
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("workspaceCanvas.groupInsights")}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => addWidget("burn-rate-line")}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t("workspaceCanvas.btnBurnRate")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => addWidget("waste-auditor")}>
                    <Zap className="h-3.5 w-3.5" />
                    {t("workspaceCanvas.btnWasteAudit")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => addWidget("upcoming-bills")}>
                    <CalendarClock className="h-3.5 w-3.5" />
                    {t("workspaceCanvas.btnUpcomingBills")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => addWidget("tracking-streak")}>
                    <Flame className="h-3.5 w-3.5" />
                    {t("workspaceCanvas.btnTrackingStreak")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => addWidget("category-budget-ring")}>
                    <Target className="h-3.5 w-3.5" />
                    {t("workspaceCanvas.btnCategoryRing")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => addWidget("roommate-sync")}>
                    <Users className="h-3.5 w-3.5" />
                    {t("workspaceCanvas.btnRoommate")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => addWidget("quick-entry-pad")}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t("workspaceCanvas.btnQuickEntry")}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("workspaceCanvas.groupFun")}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => addWidget("manga-status")}>
                    {t("workspaceCanvas.btnMangaStatus")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => addWidget("ascii-fortune")}>
                    {t("workspaceCanvas.btnAsciiFortune")}
                  </Button>
                               {/* 4.3: «Маскот» убран из палитры. Ветка рендера chibi-mascot оставлена для обратной совместимости с сохранёнными виджетами. */}
                  <Button type="button" variant="outline" onClick={() => addWidget("3d-growth-gem")}>
                    ✨ {t("workspaceCanvas.btnGem")}
                  </Button>
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent">
                    {t("workspaceCanvas.btnAddImage")}
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*,.gif"
                      onChange={(event) => handleAddMediaWidget(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <Button type="button" variant="outline" className="text-destructive" onClick={() => setWidgets([])}>
                    {t("workspaceCanvas.btnClearAll")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {widgets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/40 bg-white/10 py-16 text-center backdrop-blur-xl">
          <button
            type="button"
            onClick={() => addWidget("today-snapshot")}
            className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-white/25 text-foreground shadow-lg transition-transform duration-300 hover:scale-105"
            aria-label={t("workspaceCanvas.addFirstWidget")}
          >
            <Plus className="h-6 w-6" />
          </button>
          <p className="mt-4 text-sm font-medium">{t("workspaceCanvas.emptyTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("workspaceCanvas.emptyHint")}</p>
        </div>
      )}
      {/* Click-away layer for the widget settings menu. The widget whose
          menu is open is lifted to z-30 (above this z-20 layer), so its own
          menu stays clickable while any other click closes it. */}
      {menuForId && (
        <div className="fixed inset-0 z-20" onPointerDown={() => setMenuForId(null)} />
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={widgets.map((widget) => widget.id)} strategy={rectSortingStrategy}>
          <div ref={gridRef} className="grid grid-cols-12 auto-rows-[96px] gap-4">
            {widgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                content={renderWidgetContainer(widget)}
                menuOpen={menuForId === widget.id}
                onRemove={removeWidget}
                onUploadMedia={updateWidgetMedia}
                onToggleSettings={toggleWidgetMenu}
                onApplySize={applyWidgetSize}
                onDuplicate={duplicateWidget}
                onResizeStart={(item, event) => {
                  // #kintanjain
                  event.preventDefault();
                  event.stopPropagation();
                  setResizeState({
                    id: item.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    startColSpan: item.colSpan,
                    startRowSpan: item.rowSpan,
                  });
                }}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
          {activeWidget ? (
            <WidgetPreview widget={activeWidget} content={activeWidget.type === "media" ? <div className="h-full rounded-xl bg-white/15" /> : renderWidgetContainer(activeWidget)} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};