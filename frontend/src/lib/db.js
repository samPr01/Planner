// IndexedDB via Dexie — replaces localStorage-based storage.
// Tables: settings, categories, budgets, expenses (transactions),
// reminders (planned items), savingsFunds, monthlySnapshots.
import Dexie from "dexie";
import { DEFAULT_CATEGORIES } from "@/lib/defaults";
import { currentMonthKey } from "@/lib/dates";

export const db = new Dexie("ledger-budget-planner");

db.version(1).stores({
    settings: "key",
    categories: "id, type, name",
    budgets: "monthKey",
    expenses: "id, date, categoryId, type, monthKey, plannedItemId",
    reminders: "id, monthKey, categoryId, dueDate, reminderDate, status",
    savingsFunds: "id",
    monthlySnapshots: "monthKey",
});

// One-time seed + optional migration from legacy localStorage key.
export async function initDatabase() {
    try {
        const catCount = await db.categories.count();
        if (catCount === 0) {
            // bulkPut is idempotent — safe against StrictMode / race after reset
            await db.categories.bulkPut(DEFAULT_CATEGORIES);
        }
    } catch (e) {
        console.warn("category seed skipped:", e);
    }

    const settingsRow = await db.settings.get("app");
    if (!settingsRow) {
        await db.settings.put({
            key: "app",
            currentMonth: currentMonthKey(),
            notificationsEnabled: false,
        });
    }

    const mk = (await db.settings.get("app"))?.currentMonth || currentMonthKey();
    const existing = await db.budgets.get(mk);
    if (!existing) await db.budgets.put({ monthKey: mk, amount: 0 });

    // Migrate legacy localStorage snapshot if present and DB is fresh
    await migrateFromLocalStorage();
}

async function migrateFromLocalStorage() {
    try {
        const raw = localStorage.getItem("budget-planner:v1");
        if (!raw) return;
        const already = await db.settings.get("migrated");
        if (already) return;

        const parsed = JSON.parse(raw);

        if (parsed.monthlyBudgets) {
            const entries = Object.entries(parsed.monthlyBudgets).map(([monthKey, amount]) => ({ monthKey, amount: Number(amount) || 0 }));
            if (entries.length) await db.budgets.bulkPut(entries);
        }
        if (Array.isArray(parsed.categories) && parsed.categories.length) {
            await db.categories.clear();
            await db.categories.bulkPut(parsed.categories);
        }
        if (Array.isArray(parsed.plannedItems) && parsed.plannedItems.length) {
            await db.reminders.bulkPut(parsed.plannedItems);
        }
        if (Array.isArray(parsed.transactions) && parsed.transactions.length) {
            const withMonth = parsed.transactions.map((t) => ({ ...t, monthKey: t.date?.slice(0, 7) }));
            await db.expenses.bulkPut(withMonth);
        }
        if (parsed.currentMonth || parsed.settings) {
            await db.settings.put({
                key: "app",
                currentMonth: parsed.currentMonth || currentMonthKey(),
                notificationsEnabled: !!parsed.settings?.notificationsEnabled,
            });
        }

        await db.settings.put({ key: "migrated", at: new Date().toISOString() });
        localStorage.removeItem("budget-planner:v1");
    } catch (e) {
        console.warn("localStorage migration skipped:", e);
    }
}

// Whole-database export / import for backup & restore
export async function exportDatabase() {
    const [settings, categories, budgets, expenses, reminders, savingsFunds, monthlySnapshots] = await Promise.all([
        db.settings.toArray(),
        db.categories.toArray(),
        db.budgets.toArray(),
        db.expenses.toArray(),
        db.reminders.toArray(),
        db.savingsFunds.toArray(),
        db.monthlySnapshots.toArray(),
    ]);
    return { version: 1, exportedAt: new Date().toISOString(), settings, categories, budgets, expenses, reminders, savingsFunds, monthlySnapshots };
}

export async function importDatabase(payload) {
    if (!payload || typeof payload !== "object") throw new Error("Invalid backup");
    await db.transaction("rw", db.settings, db.categories, db.budgets, db.expenses, db.reminders, db.savingsFunds, db.monthlySnapshots, async () => {
        await Promise.all([
            db.settings.clear(),
            db.categories.clear(),
            db.budgets.clear(),
            db.expenses.clear(),
            db.reminders.clear(),
            db.savingsFunds.clear(),
            db.monthlySnapshots.clear(),
        ]);
        if (payload.settings?.length) await db.settings.bulkPut(payload.settings);
        if (payload.categories?.length) await db.categories.bulkPut(payload.categories);
        if (payload.budgets?.length) await db.budgets.bulkPut(payload.budgets);
        if (payload.expenses?.length) await db.expenses.bulkPut(payload.expenses);
        if (payload.reminders?.length) await db.reminders.bulkPut(payload.reminders);
        if (payload.savingsFunds?.length) await db.savingsFunds.bulkPut(payload.savingsFunds);
        if (payload.monthlySnapshots?.length) await db.monthlySnapshots.bulkPut(payload.monthlySnapshots);
    });
}

export async function resetDatabase() {
    await db.transaction("rw", db.settings, db.categories, db.budgets, db.expenses, db.reminders, db.savingsFunds, db.monthlySnapshots, async () => {
        await Promise.all([
            db.settings.clear(),
            db.categories.clear(),
            db.budgets.clear(),
            db.expenses.clear(),
            db.reminders.clear(),
            db.savingsFunds.clear(),
            db.monthlySnapshots.clear(),
        ]);
        // Re-seed within the same transaction to avoid races with useLiveQuery re-fetches
        await db.categories.bulkPut(DEFAULT_CATEGORIES);
        await db.settings.put({ key: "app", currentMonth: currentMonthKey(), notificationsEnabled: false });
        await db.budgets.put({ monthKey: currentMonthKey(), amount: 0 });
    });
}

export const uid = () => Math.random().toString(36).slice(2, 10);
