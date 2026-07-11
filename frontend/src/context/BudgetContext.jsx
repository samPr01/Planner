import React, { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, initDatabase, uid, exportDatabase, importDatabase, resetDatabase } from "@/lib/db";
import { currentMonthKey, todayISO } from "@/lib/dates";
import { DEFAULT_CATEGORIES } from "@/lib/defaults";

const BudgetContext = createContext(null);

// Reactive live queries (auto re-render on DB writes)
function useLive(fn, deps = [], defaultVal) {
    return useLiveQuery(fn, deps, defaultVal);
}

export function BudgetProvider({ children }) {
    // Ensure DB is initialized before mounting (fire-and-forget; live queries handle first paint)
    useEffect(() => {
        initDatabase().catch((e) => console.error("initDatabase failed", e));
    }, []);

    const settings = useLive(() => db.settings.get("app"), [], null);
    const categories = useLive(() => db.categories.toArray(), [], DEFAULT_CATEGORIES);
    const plannedItems = useLive(() => db.reminders.toArray(), [], []);
    const transactions = useLive(() => db.expenses.orderBy("date").reverse().toArray(), [], []);
    const budgetsList = useLive(() => db.budgets.toArray(), [], []);

    const currentMonth = settings?.currentMonth || currentMonthKey();

    const monthlyBudgets = useMemo(() => {
        const map = {};
        (budgetsList || []).forEach((b) => (map[b.monthKey] = b.amount));
        if (!(currentMonth in map)) map[currentMonth] = 0;
        return map;
    }, [budgetsList, currentMonth]);

    const budget = monthlyBudgets[currentMonth] || 0;

    // ---- Mutations ----
    const setCurrentMonth = useCallback(async (mk) => {
        const existing = await db.budgets.get(mk);
        if (!existing) await db.budgets.put({ monthKey: mk, amount: 0 });
        await db.settings.update("app", { currentMonth: mk });
    }, []);

    const setBudget = useCallback(async (mk, amount) => {
        await db.budgets.put({ monthKey: mk, amount: Number(amount) || 0 });
    }, []);

    const addCategory = useCallback(async (cat) => {
        await db.categories.add({ ...cat, id: `cat-${uid()}` });
    }, []);

    const updateCategory = useCallback(async (id, patch) => {
        await db.categories.update(id, patch);
    }, []);

    const deleteCategory = useCallback(async (id) => {
        await db.transaction("rw", db.categories, db.reminders, async () => {
            await db.categories.delete(id);
            await db.reminders.where("categoryId").equals(id).delete();
        });
    }, []);

    const addPlannedItem = useCallback(async (item) => {
        await db.reminders.add({
            id: `pi-${uid()}`,
            status: "unpaid",
            monthKey: currentMonth,
            ...item,
        });
    }, [currentMonth]);

    const updatePlannedItem = useCallback(async (id, patch) => {
        await db.reminders.update(id, patch);
    }, []);

    const deletePlannedItem = useCallback(async (id) => {
        await db.reminders.delete(id);
    }, []);

    const markPlannedItemPaid = useCallback(async (id, paidDate, remarks) => {
        await db.transaction("rw", db.reminders, db.expenses, db.categories, db.savingsFunds, async () => {
            const item = await db.reminders.get(id);
            if (!item) return;
            const cat = await db.categories.get(item.categoryId);
            const type = cat?.type === "savings" ? "saving" : "expense";
            const date = paidDate || todayISO();
            const tx = {
                id: `tx-${uid()}`,
                plannedItemId: id,
                categoryId: item.categoryId,
                name: item.name,
                amount: Number(item.amount) || 0,
                date,
                monthKey: date.slice(0, 7),
                remarks: remarks || "",
                type,
            };
            await db.expenses.add(tx);
            await db.reminders.update(id, { status: "paid", paidDate: date, remarks: tx.remarks });
            if (type === "saving") {
                const existing = await db.savingsFunds.get(item.categoryId);
                await db.savingsFunds.put({
                    id: item.categoryId,
                    balance: (existing?.balance || 0) + tx.amount,
                });
            }
        });
    }, []);

    const undoPlannedItemPaid = useCallback(async (id) => {
        await db.transaction("rw", db.reminders, db.expenses, db.savingsFunds, async () => {
            const item = await db.reminders.get(id);
            const linked = await db.expenses.where("plannedItemId").equals(id).toArray();
            for (const t of linked) {
                if (t.type === "saving") {
                    const existing = await db.savingsFunds.get(t.categoryId);
                    if (existing) {
                        await db.savingsFunds.put({ id: t.categoryId, balance: Math.max(0, (existing.balance || 0) - t.amount) });
                    }
                }
                await db.expenses.delete(t.id);
            }
            if (item) await db.reminders.update(id, { status: "unpaid", paidDate: undefined, remarks: "" });
        });
    }, []);

    const addTransaction = useCallback(async (tx) => {
        const date = tx.date || todayISO();
        await db.expenses.add({
            id: `tx-${uid()}`,
            date,
            monthKey: date.slice(0, 7),
            type: "expense",
            ...tx,
        });
        if (tx.type === "saving") {
            const existing = await db.savingsFunds.get(tx.categoryId);
            await db.savingsFunds.put({
                id: tx.categoryId,
                balance: (existing?.balance || 0) + (Number(tx.amount) || 0),
            });
        }
    }, []);

    const updateTransaction = useCallback(async (id, patch) => {
        const clean = { ...patch };
        if (clean.date) clean.monthKey = clean.date.slice(0, 7);
        await db.expenses.update(id, clean);
    }, []);

    const deleteTransaction = useCallback(async (id) => {
        await db.transaction("rw", db.expenses, db.reminders, db.savingsFunds, async () => {
            const tx = await db.expenses.get(id);
            if (!tx) return;
            if (tx.type === "saving") {
                const existing = await db.savingsFunds.get(tx.categoryId);
                if (existing) {
                    await db.savingsFunds.put({ id: tx.categoryId, balance: Math.max(0, (existing.balance || 0) - tx.amount) });
                }
            }
            if (tx.plannedItemId) {
                await db.reminders.update(tx.plannedItemId, { status: "unpaid", paidDate: undefined });
            }
            await db.expenses.delete(id);
        });
    }, []);

    const updateSettings = useCallback(async (patch) => {
        await db.settings.update("app", patch);
    }, []);

    const resetAll = useCallback(async () => {
        await resetDatabase();
    }, []);

    const value = useMemo(
        () => ({
            currentMonth,
            categories: categories || [],
            plannedItems: plannedItems || [],
            transactions: transactions || [],
            monthlyBudgets,
            budget,
            settings: {
                notificationsEnabled: !!settings?.notificationsEnabled,
            },
            // mutations
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
            exportDatabase,
            importDatabase,
        }),
        [currentMonth, categories, plannedItems, transactions, monthlyBudgets, budget, settings, setCurrentMonth, setBudget, addCategory, updateCategory, deleteCategory, addPlannedItem, updatePlannedItem, deletePlannedItem, markPlannedItemPaid, undoPlannedItemPaid, addTransaction, updateTransaction, deleteTransaction, updateSettings, resetAll]
    );

    return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
    const ctx = useContext(BudgetContext);
    if (!ctx) throw new Error("useBudget must be used within BudgetProvider");
    return ctx;
}

// Derived selectors – identical shape to before, so all consumers work unchanged
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
