import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Plus, Target, CalendarIcon, SlidersHorizontal, X, Minus, GripHorizontal, Plane, Users, Utensils, ScanLine } from "lucide-react";
// #meehikasharma
import { format } from "date-fns";
import { useFinance, type ReasonTag, type TransactionType } from "@/contexts/FinanceContext";
import { goalPercent } from "@/lib/goals";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReceiptScanner } from "@/components/ReceiptScanner";
// #vanshkapoor
import { needsReview, type FieldConfidence, type ParsedReceipt } from "@/lib/receiptParser";
import { Input } from "@/components/ui/input";
// #propertyofindia
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/components/ui/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { ReasonTags } from "@/components/forms/ReasonTags";

/**
  Category names are DATA, not UI copy: they are stored on transactions and
  matched against backend-seeded defaults, so they stay untranslated on
  purpose. Everything the user reads but does not store goes through
  i18next (`quickActions.*`).
*/
const expenseCategories = ["Housing", "Groceries", "Transport", "Entertainment", "Food", "Utilities", "Shopping", "Health", "Travel", "Education", "Other"];
const incomeCategories = ["Salary", "Freelance", "Investment", "Business", "Gift", "Other"];

type RecurrenceType = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
type GoalPeriod = "1-month" | "3-months" | "6-months" | "1-year" | "2-years" | "custom";
type BudgetPlanType = "trip" | "outing" | "event";

interface BudgetLineItem { id: string; name: string; estimate: number; }
interface FinalizedBudgetPlan {
  id: string;
  title: string;
  planType: BudgetPlanType;
  dateFrom: string;
  dateTo?: string;
  people: number;
  items: BudgetLineItem[];
  total: number;
  perPerson: number;
  createdAt: string;
  settledWith?: string[];
}

const BUDGET_PLANS_KEY = "cash-compass-budget-plans-v1";

export const QuickActions = () => {
  const { t } = useTranslation();
  const { formatFromUSD, formatAmount, convertFromUSD, convertToUSD, currency } = useCurrency();
  const { transactions, goals, addTransaction, addGoal } = useFinance();
  // ── Add Entry state ──
  const [entryOpen, setEntryOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanConfidence, setScanConfidence] = useState<{ name: FieldConfidence; amount: FieldConfidence } | null>(null);
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [txName, setTxName] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("Groceries");
  const [txDate, setTxDate] = useState<Date>(new Date());
  const [txNote, setTxNote] = useState("");
  const [txRecurrence, setTxRecurrence] = useState<RecurrenceType>("none");
  const [txUnplanned, setTxUnplanned] = useState(false);
  const [txReasonTags, setTxReasonTags] = useState<ReasonTag[]>([]);
  // ── Set Goal state ──
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalInitial, setGoalInitial] = useState("");
  const [goalIcon, setGoalIcon] = useState("🎯");
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>("6-months");
  const [goalCustomDays, setGoalCustomDays] = useState("90");
  // ── Plan Budget state ──
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetMinimized, setBudgetMinimized] = useState(false);
  const [budgetPlanType, setBudgetPlanType] = useState<BudgetPlanType>("trip");
  const [budgetTitle, setBudgetTitle] = useState("");
  const [budgetDateFrom, setBudgetDateFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [budgetDateTo, setBudgetDateTo] = useState("");
  const [budgetPeople, setBudgetPeople] = useState("1");
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemEstimate, setNewItemEstimate] = useState("");
  const [finalizedPlans, setFinalizedPlans] = useState<FinalizedBudgetPlan[]>(() => {
    const raw = localStorage.getItem(BUDGET_PLANS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as FinalizedBudgetPlan[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const onDragMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, posX: dragPos.x, posY: dragPos.y };
    e.preventDefault();
  }, [dragPos]);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setDragPos({
        x: dragStart.current.posX + (e.clientX - dragStart.current.x),
        y: dragStart.current.posY + (e.clientY - dragStart.current.y),
      });
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);
  useEffect(() => {
    localStorage.setItem(BUDGET_PLANS_KEY, JSON.stringify(finalizedPlans));
  }, [finalizedPlans]);

  const handleScanned = (receipt: ParsedReceipt) => {
    if (receipt.merchant) setTxName(receipt.merchant);
    if (receipt.amount !== null) setTxAmount(receipt.amount.toFixed(2));
    if (receipt.category && expenseCategories.includes(receipt.category)) {
      setTxCategory(receipt.category);
    }
    setTxType("expense");
    setScanConfidence({
      name: receipt.merchantConfidence,
      amount: receipt.amountConfidence,
    });
    setEntryOpen(true);
  };

  const handleAddTransaction = () => {
    const amountInput = Number(txAmount);
    const amount = convertToUSD(amountInput);
    if (!txName.trim() || !Number.isFinite(amountInput) || amountInput <= 0) {
      toast({ title: t("quickActions.entry.errTitle"), description: t("quickActions.entry.errDesc") });
      return;
    }
    const noteParts = [
      txNote,
      txRecurrence !== "none" ? `Recurring: ${txRecurrence}` : "",
      scanConfidence ? "Scanned receipt" : "",
    ].filter(Boolean);
    const noteWithRecurrence = noteParts.join(" | ");
    addTransaction({ name: txName, amount, type: txType, category: txCategory, date: txDate.toISOString().slice(0, 10), note: noteWithRecurrence, isUnplanned: txUnplanned, reasonTags: txReasonTags });
    setTxName(""); setTxAmount(""); setTxNote(""); setTxRecurrence("none"); setTxUnplanned(false); setTxReasonTags([]);
    setScanConfidence(null);
    setTxCategory(txType === "income" ? "Salary" : "Groceries");
    toast({
      title: t("quickActions.entry.okTitle"),
      description: txRecurrence !== "none"
        ? t("quickActions.entry.okDescRecurring", { rec: t(`quickActions.entry.recurrence.${txRecurrence}`) })
        : t("quickActions.entry.okDescPlain"),
    });
  };

  const goalDays = useMemo(() => {
    const map: Record<GoalPeriod, number> = { "1-month": 30, "3-months": 90, "6-months": 180, "1-year": 365, "2-years": 730, custom: Number(goalCustomDays) || 90 };
    return map[goalPeriod];
  }, [goalPeriod, goalCustomDays]);

  const handleAddGoal = () => {
    const targetInput = Number(goalTarget);
    const initialInput = Number(goalInitial || 0);
    const target = convertToUSD(targetInput);
    const initial = convertToUSD(initialInput);
    if (!goalName.trim() || !Number.isFinite(targetInput) || targetInput <= 0) {
      toast({ title: t("quickActions.goal.errTitle"), description: t("quickActions.goal.errDesc") });
      return;
    }
    addGoal({ name: goalName, target, initialAmount: Number.isFinite(initial) ? initial : 0, icon: goalIcon || "🎯" });
    setGoalName(""); setGoalTarget(""); setGoalInitial(""); setGoalIcon("🎯");
    toast({
      title: t("quickActions.goal.okTitle"),
      description: t("quickActions.goal.okDesc", {
        amount: formatAmount(targetInput),
        days: goalDays,
        perDay: formatAmount(targetInput / goalDays),
      }),
    });
  };

  const dailySavingsNeeded = useMemo(() => {
    const target = Number(goalTarget);
    const initial = Number(goalInitial || 0);
    if (!target || goalDays <= 0) return 0;
    return Math.max(0, (target - initial) / goalDays);
  }, [goalTarget, goalInitial, goalDays]);

  const budgetTotal = useMemo(() => budgetItems.reduce((s, i) => s + i.estimate, 0), [budgetItems]);
  const perPerson = useMemo(() => budgetTotal / Math.max(1, Number(budgetPeople) || 1), [budgetTotal, budgetPeople]);

  const addBudgetItem = () => {
    const estInput = Number(newItemEstimate);
    if (!newItemName.trim() || !estInput || estInput <= 0) return;
    const est = convertToUSD(estInput);
    setBudgetItems(prev => [...prev, { id: `bi-${Date.now()}`, name: newItemName.trim(), estimate: est }]);
    setNewItemName(""); setNewItemEstimate("");
  };
  const removeBudgetItem = (id: string) => setBudgetItems(prev => prev.filter(i => i.id !== id));
  const clearBudgetDraft = () => {
    setBudgetTitle("");
    setBudgetDateTo("");
    setBudgetPeople("1");
    setBudgetItems([]);
    setNewItemName("");
    setNewItemEstimate("");
  };

  const finalizeBudgetPlan = () => {
    const people = Math.max(1, Number(budgetPeople) || 1);
    if (!budgetTitle.trim()) {
      toast({ title: t("quickActions.budget.errTitleTitle"), description: t("quickActions.budget.errTitleDesc") });
      return;
    }
    if (budgetItems.length === 0) {
      toast({ title: t("quickActions.budget.errItemsTitle"), description: t("quickActions.budget.errItemsDesc") });
      return;
    }
    if (budgetDateTo && budgetDateTo < budgetDateFrom) {
      toast({ title: t("quickActions.budget.errDatesTitle"), description: t("quickActions.budget.errDatesDesc") });
      return;
    }
    const total = budgetItems.reduce((sum, item) => sum + item.estimate, 0);
    const finalizedPlan: FinalizedBudgetPlan = {
      id: `bp-${Date.now()}`,
      title: budgetTitle.trim(),
      planType: budgetPlanType,
      dateFrom: budgetDateFrom,
      dateTo: budgetDateTo || undefined,
      people,
      items: budgetItems,
      total,
      perPerson: total / people,
      createdAt: new Date().toISOString(),
    };
    setFinalizedPlans((prev) => [finalizedPlan, ...prev]);
    toast({
      title: t("quickActions.budget.okTitle"),
      description: people > 1
        ? t("quickActions.budget.okDescSplit", { total: formatFromUSD(finalizedPlan.total), perPerson: formatFromUSD(finalizedPlan.perPerson) })
        : t("quickActions.budget.okDescSolo", { total: formatFromUSD(finalizedPlan.total) }),
    });
    clearBudgetDraft();
  };

  const toggleSettled = (planId: string, person: string) => {
    setFinalizedPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const settled = plan.settledWith ?? [];
        return {
          ...plan,
          settledWith: settled.includes(person)
            ? settled.filter((p) => p !== person)
            : [...settled, person],
        };
      }),
    );
  };

  const planTypeConfig: Record<BudgetPlanType, { icon: React.ReactNode; label: string }> = {
    trip: { icon: <Plane className="w-3.5 h-3.5" />, label: t("quickActions.budget.types.trip") },
    outing: { icon: <Utensils className="w-3.5 h-3.5" />, label: t("quickActions.budget.types.outing") },
    event: { icon: <Users className="w-3.5 h-3.5" />, label: t("quickActions.budget.types.event") },
  };

  return (
    <>
      {/* ═══ ADD ENTRY DIALOG ═══ */}
      <ReceiptScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScanned={handleScanned}
      />
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("quickActions.entry.title")}</DialogTitle>
            <DialogDescription>{t("quickActions.entry.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("quickActions.entry.type")}</Label>
                <Select value={txType} onValueChange={(v) => { setTxType(v as TransactionType); setTxCategory(v === "income" ? "Salary" : "Groceries"); if (v === "income") { setTxUnplanned(false); setTxReasonTags([]); } }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">{t("quickActions.entry.typeExpense")}</SelectItem>
                    <SelectItem value="income">{t("quickActions.entry.typeIncome")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("quickActions.entry.date")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start text-left font-normal text-sm">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(txDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={txDate} onSelect={(d) => d && setTxDate(d)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine className="mr-2 h-4 w-4" />
              {t("quickActions.entry.scan")}
            </Button>
            <div className="space-y-1.5">
              <Label>{t("quickActions.entry.name")}</Label>
              <Input placeholder={t("quickActions.entry.namePlaceholder")} value={txName} onChange={(e) => { setTxName(e.target.value); setScanConfidence((c) => (c ? { ...c, name: "none" } : c)); }} />
              {scanConfidence && needsReview(scanConfidence.name) && (
                <p className="text-xs text-muted-foreground">{t("quickActions.entry.scannedCheck")}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("quickActions.entry.amount", { currency })}</Label>
                <Input type="number" min="0" step="0.01" value={txAmount} onChange={(e) => { setTxAmount(e.target.value); setScanConfidence((c) => (c ? { ...c, amount: "none" } : c)); }} placeholder="0.00" />
                {scanConfidence && needsReview(scanConfidence.amount) && (
                  <p className="text-xs text-muted-foreground">{t("quickActions.entry.scannedCheck")}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t("quickActions.entry.category")}</Label>
                <Select value={txCategory} onValueChange={setTxCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(txType === "income" ? incomeCategories : expenseCategories).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Recurring toggle */}
            <div className="rounded-xl border border-border p-3 space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("quickActions.entry.recurringQ")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {(["none","daily","weekly","biweekly","monthly","yearly"] as RecurrenceType[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTxRecurrence(r)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      txRecurrence === r
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {t(`quickActions.entry.recurrence.${r}`)}
                  </button>
                ))}
              </div>
              {txRecurrence !== "none" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("quickActions.entry.recurringNote", { rec: t(`quickActions.entry.recurrence.${txRecurrence}`) })}
                </p>
              )}
            </div>
            {txType === "expense" && (
              <div className="rounded-2xl border border-border bg-secondary/20 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{t("quickActions.entry.unplanned")}</p>
                    <p className="text-xs text-muted-foreground">{t("quickActions.entry.unplannedHint")}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={txUnplanned}
                    onClick={() => { setTxUnplanned((value) => !value); if (txUnplanned) setTxReasonTags([]); }}
                    className={`relative h-6 w-11 rounded-full transition-colors ${txUnplanned ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${txUnplanned ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {txUnplanned && <ReasonTags value={txReasonTags} onChange={setTxReasonTags} />}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("quickActions.entry.note")}</Label>
              <Textarea placeholder={t("quickActions.entry.notePlaceholder")} value={txNote} onChange={(e) => setTxNote(e.target.value)} className="h-16" />
            </div>
            <Button type="button" className="w-full" onClick={handleAddTransaction}>{t("quickActions.entry.save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ═══ SET GOAL DIALOG ═══ */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("quickActions.goal.title")}</DialogTitle>
            <DialogDescription>{t("quickActions.goal.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>{t("quickActions.goal.name")}</Label>
                <Input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder={t("quickActions.goal.namePlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("quickActions.goal.icon")}</Label>
                <Input value={goalIcon} onChange={(e) => setGoalIcon(e.target.value)} placeholder="🎯" className="text-center text-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("quickActions.goal.target", { currency })}</Label>
                <Input type="number" min="1" step="0.01" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="5000" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("quickActions.goal.initial", { currency })}</Label>
                <Input type="number" min="0" step="0.01" value={goalInitial} onChange={(e) => setGoalInitial(e.target.value)} placeholder="0" />
              </div>
            </div>
            {/* #athenanair */}
            <div className="rounded-xl border border-border p-3 space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("quickActions.goal.period")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {(["1-month","3-months","6-months","1-year","2-years","custom"] as GoalPeriod[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setGoalPeriod(p)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      goalPeriod === p
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {t(`quickActions.goal.periods.${p}`)}
                  </button>
                ))}
              </div>
              {goalPeriod === "custom" && (
                <div className="flex items-center gap-2 mt-2">
                  <Input type="number" min="7" value={goalCustomDays} onChange={(e) => setGoalCustomDays(e.target.value)} className="w-24" />
                  <span className="text-xs text-muted-foreground">{t("quickActions.goal.days")}</span>
                </div>
              )}
            </div>
            {Number(goalTarget) > 0 && (
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">{t("quickActions.goal.preview", { days: goalDays })}</p>
                <p className="text-lg font-bold">{formatAmount(dailySavingsNeeded)} <span className="text-xs font-normal text-muted-foreground">{t("quickActions.goal.perDay")}</span></p>
                <p className="text-xs text-muted-foreground">{t("quickActions.goal.perWeekMonth", { week: formatAmount(dailySavingsNeeded * 7), month: formatAmount(dailySavingsNeeded * 30) })}</p>
              </div>
            )}
            {goals.length > 0 && (
              <div className="rounded-md border p-3 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("quickActions.goal.current")}</p>
                {goals.map((g) => {
                  const pct = goalPercent(g);
                  return (
                    <div key={g.id} className="space-y-1">
                      {/* #akshitsaini */}
                      <div className="flex items-center justify-between text-sm">
                        <span>{g.icon} {g.name}</span>
                        <span className="text-xs text-muted-foreground">{formatFromUSD(g.current)} / {formatFromUSD(g.target)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button type="button" className="w-full" onClick={handleAddGoal}>{t("quickActions.goal.create")}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ═══ PLAN BUDGET — DRAGGABLE POPUP ═══ */}
      <AnimatePresence>
        {budgetOpen && !budgetMinimized && (
          <motion.div
            ref={dragRef}
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}
            className="fixed bottom-20 right-6 z-[60] w-[calc(100vw-3rem)] max-w-[380px] max-h-[70vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={onDragMouseDown}
            >
              <div className="flex items-center gap-2">
                <GripHorizontal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold font-heading">{t("quickActions.budget.title")}</span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => setBudgetMinimized(true)} className="p-1 rounded hover:bg-secondary transition-colors" title={t("quickActions.budget.minimize")}>
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => { setBudgetOpen(false); setBudgetMinimized(false); }} className="p-1 rounded hover:bg-secondary transition-colors" title={t("quickActions.budget.close")}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex gap-1.5">
                {(["trip","outing","event"] as BudgetPlanType[]).map(tp => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setBudgetPlanType(tp)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      budgetPlanType === tp ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {planTypeConfig[tp].icon}{planTypeConfig[tp].label}
                  </button>
                ))}
              </div>
              <Input placeholder={t("quickActions.budget.titlePlaceholder")} value={budgetTitle} onChange={(e) => setBudgetTitle(e.target.value)} className="text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("quickActions.budget.from")}</Label>
                  <Input type="date" value={budgetDateFrom} onChange={(e) => setBudgetDateFrom(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("quickActions.budget.toLabel")}</Label>
                  <Input type="date" value={budgetDateTo} onChange={(e) => setBudgetDateTo(e.target.value)} className="text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("quickActions.budget.people")}</Label>
                <Input type="number" min="1" value={budgetPeople} onChange={(e) => setBudgetPeople(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("quickActions.budget.items")}</Label>
                <div className="flex gap-1.5">
                  <Input placeholder={t("quickActions.budget.itemName")} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="text-xs flex-1" />
                  <Input type="number" placeholder={t("quickActions.budget.itemCost")} min="0" value={newItemEstimate} onChange={(e) => setNewItemEstimate(e.target.value)} className="text-xs w-24" />
                  <Button type="button" size="sm" variant="secondary" onClick={addBudgetItem} className="h-9 px-2">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {budgetItems.length > 0 && (
                <div className="space-y-1">
                  {budgetItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatFromUSD(item.estimate)}</span>
                        <button type="button" onClick={() => removeBudgetItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("quickActions.budget.total")}</span>
                  <span className="font-bold">{formatFromUSD(budgetTotal)}</span>
                </div>
                {Number(budgetPeople) > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("quickActions.budget.perPerson")}</span>
                    <span className="font-semibold">{formatFromUSD(perPerson)}</span>
                  </div>
                )}
                {budgetItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">{t("quickActions.budget.emptyItems")}</p>
                )}
                <Button type="button" onClick={finalizeBudgetPlan} className="w-full" disabled={budgetItems.length === 0 || !budgetTitle.trim()}>
                  {t("quickActions.budget.finalise")}
                </Button>
              </div>
              {finalizedPlans.length > 0 && (
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("quickActions.budget.latest")}</p>
                    <Badge variant="secondary">{planTypeConfig[finalizedPlans[0].planType].label}</Badge>
                  </div>
                  <p className="text-sm font-semibold">{finalizedPlans[0].title}</p>
                  <p className="text-xs text-muted-foreground">
                    {finalizedPlans[0].dateFrom}
                    {finalizedPlans[0].dateTo ? ` ${t("quickActions.budget.dateTo")} ${finalizedPlans[0].dateTo}` : ""}
                  </p>
                  <div className="space-y-1">
                    {finalizedPlans[0].items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatFromUSD(item.estimate)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-border space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("quickActions.budget.finalBill")}</span>
                      <span className="font-semibold">{formatFromUSD(finalizedPlans[0].total)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("quickActions.budget.split", { n: finalizedPlans[0].people })}</span>
                      <span className="font-semibold">{formatFromUSD(finalizedPlans[0].perPerson)}</span>
                    </div>
                  </div>
                </div>
              )}
              {finalizedPlans.length > 1 && (
                <div className="rounded-xl border border-border p-3 space-y-1.5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("quickActions.budget.recent")}</p>
                  {finalizedPlans.slice(1, 4).map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between text-xs">
                      <span>{plan.title}</span>
                      <span className="font-medium">{formatFromUSD(plan.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ═══ MINIMIZED TAB (right edge) ═══ */}
      <AnimatePresence>
        {budgetOpen && budgetMinimized && (
          <motion.button
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            type="button"
            onClick={() => setBudgetMinimized(false)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] flex items-center gap-2 bg-primary text-primary-foreground pl-3 pr-2 py-3 rounded-l-xl shadow-lg text-xs font-medium writing-mode-vertical"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 rotate-90" />
            <span>{t("quickActions.budget.minimizedLabel", { amount: formatFromUSD(budgetTotal) })}</span>
          </motion.button>
        )}
      </AnimatePresence>
      {/* ═══ FAB BUTTONS ═══ */}
      <div data-tour="action-controls" className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <motion.button
          type="button"
          aria-label={t("quickActions.fab.addEntry")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-card-hover text-sm font-medium font-heading"
          onClick={() => setEntryOpen(true)}
        >
          <Plus className="w-4 h-4" />
          {t("quickActions.fab.addEntry")}
        </motion.button>
        <motion.button
          type="button"
          aria-label={t("quickActions.fab.setGoal")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg shadow-card text-sm font-medium font-heading"
          onClick={() => setGoalOpen(true)}
        >
          <Target className="w-4 h-4" />
          {t("quickActions.fab.setGoal")}
        </motion.button>
        <motion.button
          type="button"
          aria-label={t("quickActions.fab.planBudget")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-card text-card-foreground px-4 py-2.5 rounded-lg border border-border shadow-card text-sm font-medium font-heading"
          onClick={() => { setBudgetOpen(true); setBudgetMinimized(false); }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t("quickActions.fab.planBudget")}
        </motion.button>
      </div>
    </>
  );
};