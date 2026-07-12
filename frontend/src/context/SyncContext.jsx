import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { fullSync, cloudHasData, pushAll, pullAll, mergeAll, attachUserIdToLocal, clearLocalUserId } from "@/lib/syncService";
import { countPending, getSyncMeta } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const SyncContext = createContext(null);
const PERIOD_MS = 3 * 60 * 1000; // sync every 3 minutes when online + signed in

export function SyncProvider({ children }) {
    const { user, cloudEnabled } = useAuth();
    const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
    const [status, setStatus] = useState("idle"); // idle | syncing | synced | failed | offline
    const [lastSyncAt, setLastSyncAt] = useState(null);
    const [firstLoginNeeded, setFirstLoginNeeded] = useState(null); // { userId } | null
    const timerRef = useRef(null);

    // Live pending count from Dexie
    const pendingCount = useLiveQuery(async () => (user ? await countPending() : 0), [user], 0);

    // Load lastSync meta on mount / user change
    useEffect(() => {
        getSyncMeta().then((m) => setLastSyncAt(m?.lastSyncAt || null));
    }, [user]);

    // Online/offline listeners
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", off);
        };
    }, []);

    const triggerSync = useCallback(async () => {
        if (!supabase || !user) return;
        if (!online) {
            setStatus("offline");
            return;
        }
        const res = await fullSync(user.id, setStatus);
        if (res?.at) setLastSyncAt(res.at);
    }, [user, online]);

    // First-login detection: when user signs in, check cloud
    useEffect(() => {
        (async () => {
            if (!supabase || !user) {
                setFirstLoginNeeded(null);
                return;
            }
            const hasCloud = await cloudHasData(user.id);
            const localCount = await countPending(); // pending = essentially all local records post-migration
            if (hasCloud && localCount > 0) {
                // conflict: show dialog
                setFirstLoginNeeded({ userId: user.id });
            } else if (hasCloud) {
                // no local data, pull cloud
                await pullAll(user.id);
                setStatus("synced");
                const m = await getSyncMeta();
                setLastSyncAt(m?.lastSyncAt || null);
            } else {
                // fresh cloud, push local
                await attachUserIdToLocal(user.id);
                await triggerSync();
            }
        })();
    }, [user, triggerSync]);

    // On sign-out, detach user_id and clear last sync
    const prevUserId = useRef(null);
    useEffect(() => {
        if (prevUserId.current && !user) {
            clearLocalUserId();
            setLastSyncAt(null);
            setStatus("idle");
        }
        prevUserId.current = user?.id || null;
    }, [user]);

    // Periodic + online-listener sync
    useEffect(() => {
        if (!supabase || !user) return;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(triggerSync, PERIOD_MS);
        const onOnline = () => triggerSync();
        window.addEventListener("online", onOnline);
        return () => {
            clearInterval(timerRef.current);
            window.removeEventListener("online", onOnline);
        };
    }, [user, triggerSync]);

    const resolveFirstLogin = useCallback(
        async (choice) => {
            if (!user) return;
            setStatus("syncing");
            if (choice === "keepCloud") await pullAll(user.id);
            else if (choice === "replaceCloud") await pushAll(user.id);
            else if (choice === "merge") await mergeAll(user.id);
            setStatus("synced");
            const m = await getSyncMeta();
            setLastSyncAt(m?.lastSyncAt || null);
            setFirstLoginNeeded(null);
        },
        [user]
    );

    // Derived status pill state
    const displayStatus = !cloudEnabled || !user
        ? "local"
        : !online
          ? "offline"
          : status === "syncing"
            ? "syncing"
            : pendingCount > 0
              ? "pending"
              : "synced";

    return (
        <SyncContext.Provider
            value={{
                online,
                status: displayStatus,
                rawStatus: status,
                lastSyncAt,
                pendingCount: pendingCount || 0,
                triggerSync,
                firstLoginNeeded,
                resolveFirstLogin,
            }}
        >
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    const ctx = useContext(SyncContext);
    if (!ctx) throw new Error("useSync must be used within SyncProvider");
    return ctx;
}
