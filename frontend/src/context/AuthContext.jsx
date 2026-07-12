import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, cloudEnabled } from "@/lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(cloudEnabled);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        supabase.auth.getSession().then(({ data }) => {
            setUser(data.session?.user || null);
            setLoading(false);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
            setUser(session?.user || null);
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const signInWithPassword = useCallback(async (email, password) => {
        if (!supabase) throw new Error("Cloud sync disabled");
        return supabase.auth.signInWithPassword({ email, password });
    }, []);

    const signUpWithPassword = useCallback(async (email, password) => {
        if (!supabase) throw new Error("Cloud sync disabled");
        return supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    }, []);

    const signInWithProvider = useCallback(async (provider) => {
        if (!supabase) throw new Error("Cloud sync disabled");
        // ALWAYS redirect to root — must match Supabase Redirect URLs allowlist.
        // Using a sub-path here can cause the SDK to fail to generate a URL,
        // and Chrome/Safari can silently block window.location.assign called
        // from inside an awaited promise once user activation has expired.
        const redirectTo = window.location.origin;
        // Take control of the redirect ourselves — no reliance on the SDK's
        // internal window.location.assign timing.
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo,
                skipBrowserRedirect: true,
                queryParams: { prompt: "select_account" },
            },
        });
        // eslint-disable-next-line no-console
        console.info("[Ledger] signInWithOAuth result:", { provider, hasUrl: !!data?.url, url: data?.url, error });
        if (error) return { data, error };
        if (!data?.url) {
            const e = new Error("Supabase did not return an OAuth URL. Check Site URL and Redirect URLs configuration in Supabase Auth settings.");
            console.error("[Ledger]", e.message);
            return { data, error: e };
        }
        // Explicit synchronous navigation — bypasses user-gesture timing issues.
        window.location.href = data.url;
        return { data, error: null };
    }, []);

    const signOut = useCallback(async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                cloudEnabled,
                signInWithPassword,
                signUpWithPassword,
                signInWithProvider,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
