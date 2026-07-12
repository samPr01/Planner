// Sync engine — offline-first bidirectional sync between Dexie and Supabase.
// Never blocks the UI. Fires-and-forgets from all mutation paths.
import { db, SYNC_TABLES, setSyncMeta, getSyncMeta } from "@/lib/db";
import { supabase } from "@/lib/supabase";

/** Attach user_id to all local rows currently missing it (post sign-in). */
export async function attachUserIdToLocal(userId) {
    await Promise.all(
        SYNC_TABLES.map((t) =>
            db[t.local]
                .toCollection()
                .modify((r) => {
                    if (!r.user_id) {
                        r.user_id = userId;
                        r.syncStatus = "pending";
                    }
                })
        )
    );
}

/** Detach user_id from local rows (post sign-out) so nothing leaks on next sign-in. */
export async function clearLocalUserId() {
    await Promise.all(
        SYNC_TABLES.map((t) =>
            db[t.local].toCollection().modify((r) => {
                r.user_id = null;
                r.syncStatus = "local";
            })
        )
    );
}

/** Check whether the cloud has any records for this user. */
export async function cloudHasData(userId) {
    if (!supabase) return false;
    for (const t of SYNC_TABLES) {
        const { count, error } = await supabase.from(t.remote).select("*", { count: "exact", head: true }).eq("user_id", userId);
        if (!error && count && count > 0) return true;
    }
    return false;
}

function toRemote(t, record, userId) {
    return {
        id: String(record[t.pk]),
        user_id: userId,
        data: record,
        created_at: record.createdAt || new Date().toISOString(),
        updated_at: record.updatedAt || new Date().toISOString(),
        deleted_at: record.deletedAt || null,
    };
}

/** Push local pending rows for one table. */
async function pushTable(userId, t) {
    const pending = await db[t.local].where("syncStatus").equals("pending").toArray();
    const mine = pending.filter((r) => r.user_id === userId);
    if (!mine.length) return { pushed: 0 };
    const rows = mine.map((r) => toRemote(t, r, userId));
    const { error } = await supabase.from(t.remote).upsert(rows, { onConflict: "id,user_id" });
    if (error) {
        await Promise.all(mine.map((r) => db[t.local].update(r[t.pk], { syncStatus: "failed" })));
        return { error };
    }
    await Promise.all(mine.map((r) => db[t.local].update(r[t.pk], { syncStatus: "synced" })));
    return { pushed: mine.length };
}

/** Pull remote changes newer than lastSyncAt. Last-modified-wins. */
async function pullTable(userId, t, since) {
    let q = supabase.from(t.remote).select("*").eq("user_id", userId);
    if (since) q = q.gt("updated_at", since);
    const { data, error } = await q;
    if (error) return { error };
    let applied = 0;
    for (const row of data || []) {
        const local = await db[t.local].get(row.id);
        const remoteUpdated = row.updated_at;
        const localUpdated = local?.updatedAt;
        if (row.deleted_at) {
            if (local) await db[t.local].delete(local[t.pk]);
            applied += 1;
            continue;
        }
        if (!local || !localUpdated || localUpdated < remoteUpdated) {
            await db[t.local].put({ ...(row.data || {}), syncStatus: "synced", user_id: userId, updatedAt: remoteUpdated, createdAt: row.created_at });
            applied += 1;
        }
    }
    return { pulled: applied };
}

/** Full bidirectional sync cycle. Safe to call repeatedly. */
export async function fullSync(userId, onStatus) {
    if (!supabase || !userId) return { skipped: true };
    onStatus?.("syncing");
    try {
        const meta = await getSyncMeta();
        for (const t of SYNC_TABLES) {
            await pullTable(userId, t, meta.lastSyncAt);
        }
        for (const t of SYNC_TABLES) {
            await pushTable(userId, t);
        }
        const now = new Date().toISOString();
        await setSyncMeta({ lastSyncAt: now });
        onStatus?.("synced");
        return { at: now };
    } catch (e) {
        console.warn("sync failed:", e);
        onStatus?.("failed");
        return { error: e };
    }
}

/** Wipe local (except settings meta) and pull everything from cloud. */
export async function pullAll(userId) {
    if (!supabase || !userId) return;
    for (const t of SYNC_TABLES) {
        await db[t.local].clear();
    }
    await setSyncMeta({ lastSyncAt: null });
    await fullSync(userId);
}

/** Wipe cloud for user, then push local. */
export async function pushAll(userId) {
    if (!supabase || !userId) return;
    for (const t of SYNC_TABLES) {
        await supabase.from(t.remote).delete().eq("user_id", userId);
    }
    await setSyncMeta({ lastSyncAt: null });
    await attachUserIdToLocal(userId);
    await fullSync(userId);
}

/** Merge: attach user_id locally and run full bidirectional sync. */
export async function mergeAll(userId) {
    await attachUserIdToLocal(userId);
    await setSyncMeta({ lastSyncAt: null });
    await fullSync(userId);
}
