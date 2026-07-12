import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { BudgetProvider, useBudget } from "@/context/BudgetContext";
import { SyncProvider } from "@/context/SyncContext";
import FirstLoginDialog from "@/components/FirstLoginDialog";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Planned from "@/pages/Planned";
import CalendarView from "@/pages/CalendarView";
import History from "@/pages/History";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import { todayISO } from "@/lib/dates";
import { sendBrowserNotification } from "@/lib/notifications";
import { fmtINR } from "@/lib/currency";
import { toast } from "sonner";

function ReminderRunner() {
    const s = useBudget();
    useEffect(() => {
        const key = `notified:${todayISO()}`;
        const already = new Set(JSON.parse(sessionStorage.getItem(key) || "[]"));
        const today = todayISO();
        s.plannedItems.forEach((p) => {
            if (p.status === "paid") return;
            if (p.reminderDate !== today) return;
            if (already.has(p.id)) return;
            const title = `Reminder: ${p.name || "Payment"} due`;
            const body = `${fmtINR(p.amount)} — ${p.notes || "Payment due today."}`;
            toast.warning(title, { description: body });
            if (s.settings.notificationsEnabled) sendBrowserNotification(title, body);
            already.add(p.id);
        });
        sessionStorage.setItem(key, JSON.stringify(Array.from(already)));
    }, [s.plannedItems, s.settings.notificationsEnabled]);
    return null;
}

export default function App() {
    return (
        <AuthProvider>
            <BudgetProvider>
                <SyncProvider>
                    <BrowserRouter>
                        <ReminderRunner />
                        <FirstLoginDialog />
                        <Routes>
                            <Route path="/" element={<Layout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="planned" element={<Planned />} />
                                <Route path="calendar" element={<CalendarView />} />
                                <Route path="history" element={<History />} />
                                <Route path="reports" element={<Reports />} />
                                <Route path="settings" element={<Settings />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                    <Toaster position="top-right" theme="system" richColors closeButton />
                </SyncProvider>
            </BudgetProvider>
        </AuthProvider>
    );
}
