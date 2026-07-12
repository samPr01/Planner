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
        return supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
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
