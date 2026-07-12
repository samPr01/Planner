import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Single dialog with three sign-in paths: Google · Apple · Email+Password
export default function AuthDialog({ open, onOpenChange }) {
    const { signInWithPassword, signUpWithPassword, signInWithProvider, cloudEnabled } = useAuth();
    const [mode, setMode] = useState("signin"); // signin | signup
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    if (!cloudEnabled) return null;

    const oauth = async (provider) => {
        setBusy(true);
        try {
            const { error } = await signInWithProvider(provider);
            if (error) {
                console.error("[Ledger] OAuth error:", error);
                toast.error(error.message || "Sign-in failed. See console for details.");
            }
            // Success path is a full-page redirect — nothing more to do here.
        } catch (e) {
            console.error("[Ledger] OAuth threw:", e);
            toast.error(e.message || "Sign-in failed");
        } finally {
            setBusy(false);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const fn = mode === "signin" ? signInWithPassword : signUpWithPassword;
            const { error, data } = await fn(email, password);
            if (error) return toast.error(error.message);
            if (mode === "signup" && !data.session) {
                toast.success("Check your email to confirm your account.");
            } else {
                toast.success("Signed in");
                onOpenChange(false);
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid="auth-dialog" className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">
                        {mode === "signin" ? "Sign in to sync" : "Create a Ledger account"}
                    </DialogTitle>
                </DialogHeader>
                <p className="-mt-2 text-sm text-muted-foreground">
                    Sync your budget across devices. Your data stays private — encrypted at rest, only you can read it.
                </p>

                <div className="grid gap-2">
                    <Button data-testid="auth-google" variant="outline" onClick={() => oauth("google")} disabled={busy} className="justify-center rounded-full">
                        Continue with Google
                    </Button>
                    <Button data-testid="auth-apple" variant="outline" onClick={() => oauth("apple")} disabled={busy} className="justify-center rounded-full">
                        Continue with Apple
                    </Button>
                </div>

                <div className="flex items-center gap-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    or
                    <div className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={submit} className="grid gap-3">
                    <div>
                        <Label className="label-eyebrow">Email</Label>
                        <Input data-testid="auth-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" autoComplete="email" />
                    </div>
                    <div>
                        <Label className="label-eyebrow">Password</Label>
                        <Input data-testid="auth-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                    </div>
                    <Button data-testid="auth-submit" type="submit" disabled={busy} className="mt-2 rounded-full">
                        {mode === "signin" ? "Sign in" : "Create account"}
                    </Button>
                </form>

                <button
                    data-testid="auth-toggle-mode"
                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    className="text-center text-xs text-muted-foreground hover:text-foreground"
                >
                    {mode === "signin" ? "New here? Create an account →" : "Already have an account? Sign in →"}
                </button>
            </DialogContent>
        </Dialog>
    );
}
