import React from "react";
import { useSync } from "@/context/SyncContext";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, CloudOff, Cloud, RefreshCw, CircleDot } from "lucide-react";

// Small pill: 🟢 Synced / 🔵 Syncing / 🟡 Pending / 🔴 Offline
export default function SyncIndicator({ compact = false }) {
    const { status, pendingCount, triggerSync } = useSync();

    const map = {
        local: { label: "Local only", tone: "text-muted-foreground", dot: "bg-muted-foreground/40", icon: CircleDot },
        offline: { label: "Offline", tone: "text-danger", dot: "bg-danger", icon: WifiOff },
        syncing: { label: "Syncing…", tone: "text-foreground", dot: "bg-blue-400 animate-pulse", icon: RefreshCw },
        pending: { label: `Pending ${pendingCount}`, tone: "text-warning", dot: "bg-warning", icon: CloudOff },
        synced: { label: "Synced", tone: "text-success", dot: "bg-success", icon: Cloud },
    };
    const s = map[status] || map.local;

    return (
        <button
            data-testid="sync-indicator"
            onClick={triggerSync}
            title={s.label}
            className={cn(
                "group inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:border-foreground",
                s.tone
            )}
        >
            <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
            {!compact && <span className="tracking-tight">{s.label}</span>}
        </button>
    );
}
