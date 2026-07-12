import React, { useState } from "react";
import { useBudget } from "@/context/BudgetContext";
import { useAuth } from "@/context/AuthContext";
import { useSync } from "@/context/SyncContext";
import AuthDialog from "@/components/AuthDialog";
import { Panel, Eyebrow } from "@/components/ui-primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { monthLabel, currentMonthKey } from "@/lib/dates";
import { requestNotificationPermission, isNotificationSupported, sendBrowserNotification } from "@/lib/notifications";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, LogOut, LogIn } from "lucide-react";

function useDeviceName() {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const os = /Win/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Device";
    const browser = /Firefox/.test(ua) ? "Firefox" : /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Browser";
    return `${browser} on ${os}`;
}

function fmtRelative(iso) {
    if (!iso) return "Never";
    const then = new Date(iso).getTime();
    const now = Date.now();
    const s = Math.round((now - then) / 1000);
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(iso).toLocaleString();
}

export default function Settings() {
    const s = useBudget();
    const { user, cloudEnabled, signOut } = useAuth();
    const { status, lastSyncAt, pendingCount, triggerSync } = useSync();
    const [confirm, setConfirm] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const device = useDeviceName();

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

    const exportData = async () => {
        const data = await s.exportDatabase();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                await s.importDatabase(parsed);
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

            <Panel data-testid="cloud-sync-panel">
                <div className="flex items-center justify-between">
                    <div>
                        <Eyebrow>Cloud sync</Eyebrow>
                        <p className="mt-2 text-sm text-muted-foreground">Optional. Sign in to sync across devices. Your local data always stays put.</p>
                    </div>
                    {user && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{status}</span>
                    )}
                </div>

                {!cloudEnabled && (
                    <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                        Cloud sync is disabled. Configure <span className="font-mono">REACT_APP_SUPABASE_URL</span> and <span className="font-mono">REACT_APP_SUPABASE_ANON_KEY</span> to enable.
                    </p>
                )}

                {cloudEnabled && !user && (
                    <Button data-testid="sign-in-btn" onClick={() => setAuthOpen(true)} className="mt-4 rounded-full">
                        <LogIn className="mr-2 h-4 w-4" /> Sign in
                    </Button>
                )}

                {cloudEnabled && user && (
                    <div className="mt-4 grid gap-3">
                        <Row label="Signed in as" value={user.email || user.id} testid="cloud-user" />
                        <Row label="Device" value={device} testid="cloud-device" />
                        <Row label="Sync status" value={status} testid="cloud-status" />
                        <Row label="Last sync" value={fmtRelative(lastSyncAt)} testid="cloud-last-sync" />
                        <Row label="Pending changes" value={pendingCount} testid="cloud-pending" />
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button data-testid="manual-sync-btn" onClick={() => { triggerSync(); toast.success("Sync started"); }} variant="outline" className="rounded-full">
                                <RefreshCw className="mr-2 h-4 w-4" /> Sync now
                            </Button>
                            <Button data-testid="sign-out-btn" onClick={async () => { await signOut(); toast.success("Signed out"); }} variant="ghost" className="rounded-full">
                                <LogOut className="mr-2 h-4 w-4" /> Sign out
                            </Button>
                        </div>
                    </div>
                )}
            </Panel>

            <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

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
                <p className="mt-2 text-sm text-muted-foreground">Your data is stored in this browser (IndexedDB). Export a JSON backup to keep it safe.</p>
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
                    Ledger — a distraction-free personal budget planner. Your data lives on your device first; the cloud is optional.
                </p>
            </Panel>
        </div>
    );
}

function Row({ label, value, testid }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
            <span data-testid={testid} className="max-w-[60%] truncate text-sm font-medium">{value}</span>
        </div>
    );
}
