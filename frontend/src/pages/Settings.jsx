import React, { useState } from "react";
import { useBudget } from "@/context/BudgetContext";
import { Panel, Eyebrow } from "@/components/ui-primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { monthLabel, currentMonthKey } from "@/lib/dates";
import { requestNotificationPermission, isNotificationSupported, sendBrowserNotification } from "@/lib/notifications";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export default function Settings() {
    const s = useBudget();
    const [confirm, setConfirm] = useState(false);

    const permission = typeof Notification !== "undefined" ? Notification.permission : "unsupported";

    const toggleNotif = async () => {
        if (!isNotificationSupported()) {
            toast.error("Notifications not supported on this device.");
            return;
        }
        if (s.settings.notificationsEnabled) {
            s.updateSettings({ notificationsEnabled: false });
            toast.success("Notifications disabled");
            return;
        }
        const perm = await requestNotificationPermission();
        if (perm === "granted") {
            s.updateSettings({ notificationsEnabled: true });
            sendBrowserNotification("Ledger", "Notifications are on. You'll be reminded before payments are due.");
            toast.success("Notifications enabled");
        } else {
            toast.error("Permission denied. Enable in browser settings.");
        }
    };

    const exportData = () => {
        const raw = localStorage.getItem("budget-planner:v1") || "{}";
        const blob = new Blob([raw], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ledger-backup-${currentMonthKey()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Backup downloaded");
    };

    const importData = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                localStorage.setItem("budget-planner:v1", JSON.stringify(parsed));
                toast.success("Imported. Reloading...");
                setTimeout(() => window.location.reload(), 800);
            } catch {
                toast.error("Invalid backup file");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <header>
                <div className="label-eyebrow">Settings</div>
                <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">Preferences</h1>
            </header>

            <Panel>
                <Eyebrow>Active month</Eyebrow>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                    <Input
                        data-testid="active-month-input"
                        type="month"
                        value={s.currentMonth}
                        onChange={(e) => s.setCurrentMonth(e.target.value)}
                    />
                    <span className="self-center text-sm text-muted-foreground">{monthLabel(s.currentMonth)}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">All dashboards, planning, and reports use this month.</p>
            </Panel>

            <Panel>
                <div className="flex items-center justify-between">
                    <div>
                        <Eyebrow>Browser notifications</Eyebrow>
                        <p className="mt-2 text-sm text-muted-foreground">Get desktop alerts when reminders are due. Permission: <span className="font-mono uppercase">{permission}</span></p>
                    </div>
                    <Switch data-testid="toggle-notif" checked={!!s.settings.notificationsEnabled} onCheckedChange={toggleNotif} />
                </div>
            </Panel>

            <Panel>
                <Eyebrow>Backup & restore</Eyebrow>
                <p className="mt-2 text-sm text-muted-foreground">Your data lives in this browser. Export a JSON backup to keep it safe.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                    <Button data-testid="export-btn" onClick={exportData} variant="outline" className="rounded-full">Export backup</Button>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-foreground">
                        Restore backup
                        <input data-testid="import-input" type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
                    </label>
                </div>
            </Panel>

            <Panel className="border-danger/30">
                <Eyebrow className="text-danger">Danger zone</Eyebrow>
                <p className="mt-2 text-sm text-muted-foreground">Reset all data. This cannot be undone.</p>
                {!confirm ? (
                    <Button data-testid="reset-btn" onClick={() => setConfirm(true)} variant="outline" className="mt-4 rounded-full border-danger/40 text-danger hover:bg-danger/10 hover:text-danger">
                        <AlertTriangle className="mr-2 h-4 w-4" /> Reset everything
                    </Button>
                ) : (
                    <div className="mt-4 flex gap-2">
                        <Button data-testid="reset-confirm-btn" onClick={() => { s.resetAll(); toast.success("Reset complete"); setConfirm(false); }} className="rounded-full bg-danger text-white hover:bg-danger/90">Yes, reset</Button>
                        <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
                    </div>
                )}
            </Panel>

            <Panel>
                <Eyebrow>About</Eyebrow>
                <p className="mt-2 text-sm text-muted-foreground">
                    Ledger — a distraction-free personal budget planner. No accounts. No banks. All data private, stored locally in your browser.
                </p>
            </Panel>
        </div>
    );
}
