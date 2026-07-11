import React from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children, ...rest }) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-muted-foreground/30 md:p-7",
                className
            )}
            {...rest}
        >
            {children}
        </div>
    );
}

export function Eyebrow({ children, className }) {
    return <div className={cn("label-eyebrow", className)}>{children}</div>;
}

export function ProgressBar({ value = 0, tone = "safe", className }) {
    const clamped = Math.max(0, Math.min(100, value));
    const color =
        tone === "danger"
            ? "bg-danger"
            : tone === "warning"
              ? "bg-warning"
              : tone === "success"
                ? "bg-success"
                : "bg-foreground";
    return (
        <div className={cn("h-[6px] w-full overflow-hidden rounded-full bg-muted", className)}>
            <div
                className={cn("h-full rounded-full transition-all duration-500 ease-out", color)}
                style={{ width: `${Math.min(clamped, 100)}%` }}
            />
        </div>
    );
}

export function Ring({ value = 0, size = 160, stroke = 12, label, sublabel, tone = "primary" }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, value));
    const dash = (clamped / 100) * c;
    const strokeColor =
        tone === "danger"
            ? "hsl(var(--danger))"
            : tone === "warning"
              ? "hsl(var(--warning))"
              : "hsl(var(--foreground))";
    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={strokeColor}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${dash} ${c}`}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-mono text-3xl font-medium tabular tracking-tight">{label}</div>
                {sublabel && <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>}
            </div>
        </div>
    );
}
