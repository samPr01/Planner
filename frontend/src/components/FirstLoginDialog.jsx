import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSync } from "@/context/SyncContext";
import { Cloud, ArrowUpToLine, GitMerge } from "lucide-react";

// Shown on first sign-in when both cloud and local have data
export default function FirstLoginDialog() {
    const { firstLoginNeeded, resolveFirstLogin } = useSync();
    const open = !!firstLoginNeeded;

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent data-testid="first-login-dialog" className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">Cloud data found</DialogTitle>
                </DialogHeader>
                <p className="-mt-2 text-sm text-muted-foreground">
                    You already have data in the cloud and on this device. How would you like to reconcile them?
                </p>

                <div className="mt-2 grid gap-2">
                    <Choice
                        icon={Cloud}
                        title="Keep Cloud Data"
                        subtitle="Replace this device with what's stored in the cloud."
                        onClick={() => resolveFirstLogin("keepCloud")}
                        testid="first-login-keep-cloud"
                    />
                    <Choice
                        icon={ArrowUpToLine}
                        title="Replace Cloud With Local Data"
                        subtitle="Overwrite the cloud with what's on this device."
                        onClick={() => resolveFirstLogin("replaceCloud")}
                        testid="first-login-replace-cloud"
                    />
                    <Choice
                        icon={GitMerge}
                        title="Merge Both"
                        subtitle="Last edit wins for conflicting records."
                        onClick={() => resolveFirstLogin("merge")}
                        testid="first-login-merge"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Choice({ icon: Icon, title, subtitle, onClick, testid }) {
    return (
        <Button
            data-testid={testid}
            variant="outline"
            onClick={onClick}
            className="h-auto justify-start gap-3 rounded-lg px-3 py-3 text-left"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>
            </span>
        </Button>
    );
}
