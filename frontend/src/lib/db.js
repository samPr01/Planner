// IndexedDB via Dexie — v2 adds sync metadata (updatedAt, createdAt, syncStatus, deletedAt, user_id)
import Dexie from "dexie";
import { DEFAULT_CATEGORIES } from "@/lib/defaults";
import { currentMonthKey } from "@/lib/dates";

export const db = new Dexie("ledger-budget-planner");

// v1 (pre-sync)
db.version(1).stores({
    settings: "key",
    categories: "id, type, name",
    budgets: "monthKey",
    expenses: "id, date, categoryId, type, monthKey, plannedItemId",
    reminders: "id, monthKey, categoryId, dueDate, reminderDate, status",
    savingsFunds: "id",
    monthlySnapshots: "monthKey",
});

// v2 — add sync indexes and stamp existing rows
db.version(2)
    .stores({
        settings: "key, syncStatus, updatedAt",
        categories: "id, type, name, syncStatus, updatedAt, deletedAt",
        budgets: "monthKey, syncStatus, updatedAt",
        expenses: "id, date, categoryId, type, monthKey, plannedItemId, syncStatus, updatedAt, deletedAt",
        reminders: "id, monthKey, categoryId, dueDate, reminderDate, status, syncStatus, updatedAt, deletedAt",
        savingsFunds: "id, syncStatus, updatedAt",
        monthlySnapshots: "monthKey, syncStatus, updatedAt",
    })
    .upgrade(async (tx) => {
        const now = new Date().toISOString();
        const stamp = { syncStatus: "pending", updatedAt: now, createdAt: now, user_id: null };
        await Promise.all(
            ["settings", "categories", "budgets", "expenses", "reminders", "savingsFunds", "monthlySnapshots"].map((t) =>
                tx.table(t).toCollection().modify((r) => {
                    if (!r.updatedAt) Object.assign(r, stamp);
                })
            )
        );
    });

export async function initDatabase() {
    try {
        const catCount = await db.categories.count();
        if (catCount === 0) {
            const now = new Date().toISOString();
            await db.categories.bulkPut(
                DEFAULT_CATEGORIES.map((c) => ({ ...c, syncStatus: "pending", updatedAt: now, createdAt: now, user_id: null }))
            );
        }
    } catch (e) {
        console.warn("category seed skipped:", e);
    }

    const settingsRow = await db.settings.get("app");
    if (!settingsRow) {
        const now = new Date().toISOString();
        await db.settings.put({
            key: "app",
            currentMonth: currentMonthKey(),
            notificationsEnabled: false,
            syncStatus: "pending",
            updatedAt: now,
            createdAt: now,
            user_id: null,
        });
    }

    const mk = (await db.settings.get("app"))?.currentMonth || currentMonthKey();
    const existing = await db.budgets.get(mk);
    if (!existing) {
        const now = new Date().toISOString();
        await db.budgets.put({ monthKey: mk, amount: 0, syncStatus: "pending", updatedAt: now, createdAt: now, user_id: null });
    }

    await migrateFromLocalStorage();
}

async function migrateFromLocalStorage() {
    try {
        const raw = localStorage.getItem("budget-planner:v1");
        if (!raw) return;
        const already = await db.settings.get("migrated");
        if (already) return;
        const parsed = JSON.parse(raw);
        const now = new Date().toISOString();
        const stamp = { syncStatus: "pending", updatedAt: now, createdAt: now, user_id: null };

        if (parsed.monthlyBudgets) {
            await db.budgets.bulkPut(Object.entries(parsed.monthlyBudgets).map(([monthKey, amount]) => ({ monthKey, amount: Number(amount) || 0, ...stamp })));
        }
        if (Array.isArray(parsed.categories) && parsed.categories.length) {
            await db.categories.clear();
            await db.categories.bulkPut(parsed.categories.map((c) => ({ ...c, ...stamp })));
        }
        if (Array.isArray(parsed.plannedItems) && parsed.plannedItems.length) {
            await db.reminders.bulkPut(parsed.plannedItems.map((p) => ({ ...p, ...stamp })));
        }
        if (Array.isArray(parsed.transactions) && parsed.transactions.length) {
            await db.expenses.bulkPut(parsed.transactions.map((t) => ({ ...t, monthKey: t.date?.slice(0, 7), ...stamp })));
        }
        if (parsed.currentMonth || parsed.settings) {
            await db.settings.put({
                key: "app",
                currentMonth: parsed.currentMonth || currentMonthKey(),
                notificationsEnabled: !!parsed.settings?.notificationsEnabled,
                ...stamp,
            });
        }
        await db.settings.put({ key: "migrated", at: new Date().toISOString(), ...stamp });
        localStorage.removeItem("budget-planner:v1");
    } catch (e) {
        console.warn("localStorage migration skipped:", e);
    }
}

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
    return { version: 2, exportedAt: new Date().toISOString(), settings, categories, budgets, expenses, reminders, savingsFunds, monthlySnapshots };
}

export async function importDatabase(payload) {
    if (!payload || typeof payload !== "object") throw new Error("Invalid backup");
    await db.transaction("rw", db.settings, db.categories, db.budgets, db.expenses, db.reminders, db.savingsFunds, db.monthlySnapshots, async () => {
        await Promise.all(["settings", "categories", "budgets", "expenses", "reminders", "savingsFunds", "monthlySnapshots"].map((t) => db[t].clear()));
        for (const t of ["settings", "categories", "budgets", "expenses", "reminders", "savingsFunds", "monthlySnapshots"]) {
            if (payload[t]?.length) await db[t].bulkPut(payload[t]);
        }
    });
}

export async function resetDatabase() {
    await db.transaction("rw", db.settings, db.categories, db.budgets, db.expenses, db.reminders, db.savingsFunds, db.monthlySnapshots, async () => {
        await Promise.all(["settings", "categories", "budgets", "expenses", "reminders", "savingsFunds", "monthlySnapshots"].map((t) => db[t].clear()));
        const now = new Date().toISOString();
        const stamp = { syncStatus: "pending", updatedAt: now, createdAt: now, user_id: null };
        await db.categories.bulkPut(DEFAULT_CATEGORIES.map((c) => ({ ...c, ...stamp })));
        await db.settings.put({ key: "app", currentMonth: currentMonthKey(), notificationsEnabled: false, ...stamp });
        await db.budgets.put({ monthKey: currentMonthKey(), amount: 0, ...stamp });
    });
}

// Sync helpers — used by syncService
export const SYNC_TABLES = [
    { local: "settings", remote: "settings", pk: "key" },
    { local: "categories", remote: "categories", pk: "id" },
    { local: "budgets", remote: "budgets", pk: "monthKey" },
    { local: "expenses", remote: "expenses", pk: "id" },
    { local: "reminders", remote: "reminders", pk: "id" },
    { local: "savingsFunds", remote: "savings_funds", pk: "id" },
    { local: "monthlySnapshots", remote: "monthly_snapshots", pk: "monthKey" },
];

export async function countPending() {
    const counts = await Promise.all(SYNC_TABLES.map((t) => db[t.local].where("syncStatus").equals("pending").count()));
    return counts.reduce((a, b) => a + b, 0);
}

export async function setSyncMeta(patch) {
    const existing = (await db.settings.get("sync")) || { key: "sync" };
    await db.settings.put({ ...existing, ...patch });
}

export async function getSyncMeta() {
    return (await db.settings.get("sync")) || { key: "sync", lastSyncAt: null };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
