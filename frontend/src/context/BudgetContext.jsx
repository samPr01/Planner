import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { DEFAULT_CATEGORIES } from "@/lib/defaults";
import { currentMonthKey, todayISO } from "@/lib/dates";

const STORAGE_KEY = "budget-planner:v1";
const BudgetContext = createContext(null);

const uid = () => Math.random().toString(36).slice(2, 10);

const initialState = () => ({
    monthlyBudgets: { [currentMonthKey()]: 0 },
    categories: DEFAULT_CATEGORIES,
    plannedItems: [], // { id, categoryId, name, amount, dueDate, reminderDate, reminderTime, notes, priority, recurring, monthKey, status, paidDate, remarks }
    transactions: [], // { id, categoryId, plannedItemId?, name, amount, date, remarks, type: 'expense'|'saving' }
    currentMonth: currentMonthKey(),
    settings: { notificationsEnabled: false },
});

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return initialState();
        const parsed = JSON.parse(raw);
        return { ...initialState(), ...parsed };
    } catch {
        return initialState();
    }
}

export function BudgetProvider({ children }) {
    const [state, setState] = useState(load);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    const setCurrentMonth = useCallback((mk) => {
        setState((s) => ({
            ...s,
            currentMonth: mk,
            monthlyBudgets: s.monthlyBudgets[mk] !== undefined ? s.monthlyBudgets : { ...s.monthlyBudgets, [mk]: 0 },
        }));
    }, []);

    const setBudget = useCallback((mk, amount) => {
        setState((s) => ({ ...s, monthlyBudgets: { ...s.monthlyBudgets, [mk]: Number(amount) || 0 } }));
    }, []);

    const addCategory = useCallback((cat) => {
        setState((s) => ({ ...s, categories: [...s.categories, { ...cat, id: `cat-${uid()}` }] }));
    }, []);

    const updateCategory = useCallback((id, patch) => {
        setState((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    }, []);

    const deleteCategory = useCallback((id) => {
        setState((s) => ({
            ...s,
            categories: s.categories.filter((c) => c.id !== id),
            plannedItems: s.plannedItems.filter((p) => p.categoryId !== id),
        }));
    }, []);

    const addPlannedItem = useCallback((item) => {
        setState((s) => ({
            ...s,
            plannedItems: [
                ...s.plannedItems,
                { id: `pi-${uid()}`, status: "unpaid", monthKey: s.currentMonth, ...item },
            ],
        }));
    }, []);

    const updatePlannedItem = useCallback((id, patch) => {
        setState((s) => ({
            ...s,
            plannedItems: s.plannedItems.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
    }, []);

    const deletePlannedItem = useCallback((id) => {
        setState((s) => ({ ...s, plannedItems: s.plannedItems.filter((p) => p.id !== id) }));
    }, []);

    const markPlannedItemPaid = useCallback((id, paidDate, remarks) => {
        setState((s) => {
            const item = s.plannedItems.find((p) => p.id === id);
            if (!item) return s;
            const cat = s.categories.find((c) => c.id === item.categoryId);
            const type = cat?.type === "savings" ? "saving" : "expense";
            const tx = {
                id: `tx-${uid()}`,
                plannedItemId: id,
                categoryId: item.categoryId,
                name: item.name,
                amount: Number(item.amount) || 0,
                date: paidDate || todayISO(),
                remarks: remarks || "",
                type,
            };
            return {
                ...s,
                plannedItems: s.plannedItems.map((p) =>
                    p.id === id ? { ...p, status: "paid", paidDate: tx.date, remarks: tx.remarks } : p
                ),
                transactions: [tx, ...s.transactions],
            };
        });
    }, []);

    const undoPlannedItemPaid = useCallback((id) => {
        setState((s) => ({
            ...s,
            plannedItems: s.plannedItems.map((p) =>
                p.id === id ? { ...p, status: "unpaid", paidDate: undefined, remarks: "" } : p
            ),
            transactions: s.transactions.filter((t) => t.plannedItemId !== id),
        }));
    }, []);

    const addTransaction = useCallback((tx) => {
        setState((s) => ({
            ...s,
            transactions: [{ id: `tx-${uid()}`, date: todayISO(), type: "expense", ...tx }, ...s.transactions],
        }));
    }, []);

    const updateTransaction = useCallback((id, patch) => {
        setState((s) => ({
            ...s,
            transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
    }, []);

    const deleteTransaction = useCallback((id) => {
        setState((s) => ({
            ...s,
            transactions: s.transactions.filter((t) => t.id !== id),
            plannedItems: s.plannedItems.map((p) =>
                p.status === "paid" && s.transactions.find((t) => t.id === id)?.plannedItemId === p.id
                    ? { ...p, status: "unpaid", paidDate: undefined }
                    : p
            ),
        }));
    }, []);

    const updateSettings = useCallback((patch) => {
        setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    }, []);

    const resetAll = useCallback(() => {
        setState(initialState());
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const value = useMemo(
        () => ({
            ...state,
            budget: state.monthlyBudgets[state.currentMonth] || 0,
            setCurrentMonth,
            setBudget,
            addCategory,
            updateCategory,
            deleteCategory,
            addPlannedItem,
            updatePlannedItem,
            deletePlannedItem,
            markPlannedItemPaid,
            undoPlannedItemPaid,
            addTransaction,
            updateTransaction,
            deleteTransaction,
            updateSettings,
            resetAll,
        }),
        [state, setCurrentMonth, setBudget, addCategory, updateCategory, deleteCategory, addPlannedItem, updatePlannedItem, deletePlannedItem, markPlannedItemPaid, undoPlannedItemPaid, addTransaction, updateTransaction, deleteTransaction, updateSettings, resetAll]
    );

    return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
    const ctx = useContext(BudgetContext);
    if (!ctx) throw new Error("useBudget must be used within BudgetProvider");
    return ctx;
}

// Derived selectors
export function useMonthMetrics() {
    const s = useBudget();
    const mk = s.currentMonth;
    const budget = s.monthlyBudgets[mk] || 0;

    const monthTxs = s.transactions.filter((t) => t.date && t.date.startsWith(mk));
    const totalSpent = monthTxs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const totalSavingsAllocated = monthTxs.filter((t) => t.type === "saving").reduce((a, t) => a + t.amount, 0);
    const remaining = budget - totalSpent - totalSavingsAllocated;

    const monthPlanned = s.plannedItems.filter((p) => p.monthKey === mk);
    const catType = (id) => s.categories.find((c) => c.id === id)?.type;

    const plannedFixed = monthPlanned
        .filter((p) => catType(p.categoryId) === "fixed")
        .reduce((a, p) => a + (Number(p.amount) || 0), 0);
    const plannedSavings = monthPlanned
        .filter((p) => catType(p.categoryId) === "savings")
        .reduce((a, p) => a + (Number(p.amount) || 0), 0);

    const variableSpent = monthTxs
        .filter((t) => catType(t.categoryId) === "variable")
        .reduce((a, t) => a + t.amount, 0);

    const flexibleTotal = Math.max(0, budget - plannedFixed - plannedSavings);
    const flexibleRemaining = flexibleTotal - variableSpent;
    const flexibleUsedPct = flexibleTotal > 0 ? Math.min(200, (variableSpent / flexibleTotal) * 100) : 0;

    const utilization = budget > 0 ? Math.min(100, ((totalSpent + totalSavingsAllocated) / budget) * 100) : 0;

    return {
        mk,
        budget,
        totalSpent,
        totalSavingsAllocated,
        remaining,
        plannedFixed,
        plannedSavings,
        variableSpent,
        flexibleTotal,
        flexibleRemaining,
        flexibleUsedPct,
        utilization,
        monthTxs,
        monthPlanned,
    };
}
