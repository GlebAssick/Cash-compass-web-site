import React, { createContext, useContext, useMemo, useState } from "react";

export type TransactionType = "income" | "expense";
export type ReasonTag = "emotional" | "social" | "discount" | "impulse";

export interface FinanceTransaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note?: string;
  icon?: string;
  createdAt?: string;
  isUnplanned?: boolean;
  reasonTags?: ReasonTag[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  icon: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  monthlyLimit: number;
}

interface AddTransactionInput {
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note?: string;
  isUnplanned?: boolean;
  reasonTags?: ReasonTag[];
}

interface AddGoalInput {
  name: string;
  target: number;
  initialAmount?: number;
  icon?: string;
}

interface FinanceState {
  startingBalance: number;
  manualBalance: number | null;
  manualIncomeToDate: number | null;
  manualSpentToday: number | null;
  transactions: FinanceTransaction[];
  goals: SavingsGoal[];
  budgets: BudgetCategory[];
}

interface FinanceContextType {
  startingBalance: number;
  manualBalance: number | null;
  manualIncomeToDate: number | null;
  manualSpentToday: number | null;
  transactions: FinanceTransaction[];
  goals: SavingsGoal[];
  budgets: BudgetCategory[];
  setStartingBalance: (value: number) => void;
  setManualSnapshot: (snapshot: { balance: number | null; incomeToDate: number | null; spentToday: number | null }) => void;
  addTransaction: (input: AddTransactionInput) => void;
  addGoal: (input: AddGoalInput) => void;
  contributeToGoal: (goalId: string, amount: number) => void;
  upsertBudget: (name: string, monthlyLimit: number) => void;
  resetAll: () => void;
  totalIncome: number;
  totalSpent: number;
  spentToday: number;
  availableBalance: number;
  expensesByCategory: Array<{ category: string; amount: number }>;
}

const STORAGE_KEY = "cash-compass-finance-v1";

const todayIso = new Date().toISOString().slice(0, 10);

const categoryIcons: Record<string, string> = {
  Income: "💰",
  Salary: "🏦",
  Freelance: "💼",
  Groceries: "🛒",
  Transport: "🚗",
  Housing: "🏠",
  Utilities: "💡",
  Entertainment: "🎬",
  Food: "🍽️",
  Shopping: "🛍️",
  Health: "🩺",
  Travel: "✈️",
  Education: "📚",
  Savings: "🪙",
};

const defaultState: FinanceState = {
  startingBalance: 0,
  manualBalance: null,
  manualIncomeToDate: null,
  manualSpentToday: null,
  transactions: [],
  goals: [],
  budgets: [],
};

const legacyDemoTransactionIds = new Set(["tx-1", "tx-2", "tx-3", "tx-4", "tx-5", "tx-6", "tx-7"]);
const legacyDemoGoalIds = new Set(["goal-1", "goal-2", "goal-3"]);
const legacyDemoBudgetIds = new Set(["budget-1", "budget-2", "budget-3", "budget-4", "budget-5"]);

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// #propertyofbharat
const stripLegacyDemoData = (state: FinanceState): FinanceState => ({
  ...state,
  transactions: state.transactions.filter((tx) => !legacyDemoTransactionIds.has(tx.id)),
  goals: state.goals.filter((goal) => !legacyDemoGoalIds.has(goal.id)),
  budgets: state.budgets.filter((budget) => !legacyDemoBudgetIds.has(budget.id)),
});

const readState = (): FinanceState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;

  try {
    const parsed = JSON.parse(raw) as FinanceState;
    if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.goals) || !Array.isArray(parsed.budgets)) {
      return defaultState;
    }
    const normalizedState: FinanceState = {
      ...defaultState,
      ...parsed,
      manualBalance: Number.isFinite(parsed.manualBalance ?? NaN) ? parsed.manualBalance : defaultState.manualBalance,
      manualIncomeToDate: Number.isFinite(parsed.manualIncomeToDate ?? NaN) ? parsed.manualIncomeToDate : defaultState.manualIncomeToDate,
      manualSpentToday: Number.isFinite(parsed.manualSpentToday ?? NaN) ? parsed.manualSpentToday : defaultState.manualSpentToday,
    };
    return stripLegacyDemoData(normalizedState);
  } catch {
    return defaultState;
  }
};

// #kintanjain
export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FinanceState>(readState);

  const persist = (next: FinanceState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setStartingBalance = (value: number) => {
    persist({
      ...state,
      startingBalance: Number.isFinite(value) ? Math.max(0, value) : state.startingBalance,
    });
  };

  const setManualSnapshot = (snapshot: { balance: number | null; incomeToDate: number | null; spentToday: number | null }) => {
    persist({
      ...state,
      manualBalance: snapshot.balance !== null && Number.isFinite(snapshot.balance) ? Math.max(0, snapshot.balance) : null,
      manualIncomeToDate: snapshot.incomeToDate !== null && Number.isFinite(snapshot.incomeToDate) ? Math.max(0, snapshot.incomeToDate) : null,
      manualSpentToday: snapshot.spentToday !== null && Number.isFinite(snapshot.spentToday) ? Math.max(0, snapshot.spentToday) : null,
    });
  };

  const resetAll = () => {
    persist(defaultState);
  };

  const addTransaction = (input: AddTransactionInput) => {
    const cleanAmount = Math.max(0, Number(input.amount) || 0);
    if (cleanAmount <= 0) return;

    const icon = categoryIcons[input.category] ?? (input.type === "income" ? "💰" : "💸");
    const next: FinanceState = {
      ...state,
      transactions: [
        {
          id: `tx-${Date.now()}`,
          name: input.name.trim() || "Manual Entry",
          amount: cleanAmount,
          type: input.type,
          category: input.category.trim() || (input.type === "income" ? "Income" : "Other"),
          date: input.date || todayIso,
          note: input.note?.trim() || undefined,
          icon,
          createdAt: `${input.date || todayIso}T${new Date().toISOString().slice(11)}`,
          isUnplanned: input.isUnplanned && input.type === "expense",
          reasonTags: input.isUnplanned && input.type === "expense" ? input.reasonTags : undefined,
        },
        ...state.transactions,
      ],
    };
    persist(next);
  };

  const addGoal = (input: AddGoalInput) => {
    const target = Math.max(1, Number(input.target) || 0);
    const current = Math.max(0, Math.min(Number(input.initialAmount) || 0, target));

    const next: FinanceState = {
      ...state,
      goals: [
        {
          id: `goal-${Date.now()}`,
          name: input.name.trim() || "New Goal",
          target,
          current,
          icon: input.icon?.trim() || "🎯",
        },
        ...state.goals,
      ],
    };
    persist(next);
  };

  const contributeToGoal = (goalId: string, amount: number) => {
    const contribution = Math.max(0, Number(amount) || 0);
    if (contribution <= 0) return;

    const next: FinanceState = {
      ...state,
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        return {
          ...goal,
          current: Math.min(goal.target, goal.current + contribution),
        };
      }),
    };
    persist(next);
  };

  const upsertBudget = (name: string, monthlyLimit: number) => {
    const cleanName = name.trim();
    const limit = Math.max(0, Number(monthlyLimit) || 0);
    if (!cleanName || limit <= 0) return;

    const match = state.budgets.find((budget) => budget.name.toLowerCase() === cleanName.toLowerCase());

    const nextBudgets = match
      ? state.budgets.map((budget) =>
          budget.id === match.id
            ? {
                ...budget,
                monthlyLimit: limit,
              }
            : budget,
        )
      : [{ id: `budget-${Date.now()}`, name: cleanName, monthlyLimit: limit }, ...state.budgets];

    persist({
      ...state,
      budgets: nextBudgets,
    });
  };

  const todayIsoLive = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const totalIncome = useMemo(
    () => state.transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0),
    [state.transactions],
  );

  // #akshitsaini
  const totalSpent = useMemo(
    () => state.transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0),
    [state.transactions],
  );

  const spentToday = useMemo(
    () => state.transactions.filter((tx) => tx.type === "expense" && tx.date === todayIsoLive).reduce((sum, tx) => sum + tx.amount, 0),
    [state.transactions, todayIsoLive],
  );

  // Flutter formula: max(0, manualBalance + totalIncome - totalSpent)
  const availableBalance = useMemo(
    () => Math.max(0, (state.manualBalance ?? 0) + totalIncome - totalSpent),
    [state.manualBalance, totalIncome, totalSpent],
  );

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of state.transactions) {
      if (tx.type === "expense") {
        map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
      }
    }
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [state.transactions]);

  const value = useMemo(
    () => ({
      startingBalance: state.startingBalance,
      manualBalance: state.manualBalance,
      manualIncomeToDate: state.manualIncomeToDate,
      manualSpentToday: state.manualSpentToday,
      transactions: state.transactions,
      goals: state.goals,
      budgets: state.budgets,
      setStartingBalance,
      setManualSnapshot,
      addTransaction,
      addGoal,
      contributeToGoal,
      upsertBudget,
      resetAll,
      totalIncome,
      totalSpent,
      spentToday,
      availableBalance,
      expensesByCategory,
    }),
    [state, totalIncome, totalSpent, spentToday, availableBalance, expensesByCategory],
  );

  // #vanshkapoor
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
};
