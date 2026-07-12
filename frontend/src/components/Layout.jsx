import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, ListChecks, CalendarDays, Receipt, PieChart, Settings, Moon, Sun, IndianRupee } from "lucide-react";
import { useBudget } from "@/context/BudgetContext";
import { monthLabel } from "@/lib/dates";
import SyncIndicator from "@/components/SyncIndicator";

const NAV = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
    { to: "/planned", label: "Planned Budget", icon: ListChecks, testid: "nav-planned" },
    { to: "/calendar", label: "Calendar", icon: CalendarDays, testid: "nav-calendar" },
    { to: "/history", label: "History", icon: Receipt, testid: "nav-history" },
    { to: "/reports", label: "Reports & Analytics", icon: PieChart, testid: "nav-reports" },
    { to: "/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

function useTheme() {
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem("theme");
        if (stored) return stored;
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    });
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);
    return [theme, setTheme];
}

export default function Layout() {
    const { currentMonth } = useBudget();
    const [theme, setTheme] = useTheme();
    const location = useLocation();

    return (
        <div className="grain min-h-screen bg-background text-foreground">
            <div className="mx-auto flex min-h-screen max-w-[1400px]">
                {/* Sidebar */}
                <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-border px-6 py-8 md:flex">
                    <div>
                        <div className="mb-14 flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
                                <IndianRupee className="h-4 w-4" strokeWidth={2} />
                            </div>
                            <div>
                                <div className="font-display text-lg font-medium leading-none tracking-tight">Ledger</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Personal Finance</div>
                            </div>
                        </div>
                        <div className="mb-4 label-eyebrow">Navigate</div>
                        <nav className="flex flex-col gap-1">
                            {NAV.map((n) => (
                                <NavLink
                                    key={n.to}
                                    to={n.to}
                                    end={n.end}
                                    data-testid={n.testid}
                                    className={({ isActive }) =>
                                        `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                                            isActive
                                                ? "bg-accent text-foreground"
                                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                        }`
                                    }
                                >
                                    <n.icon className="h-4 w-4" strokeWidth={1.5} />
                                    {n.label}
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-start">
                            <SyncIndicator />
                        </div>
                        <button
                            data-testid="theme-toggle"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <span className="flex items-center gap-2">
                                {theme === "dark" ? <Moon className="h-4 w-4" strokeWidth={1.5} /> : <Sun className="h-4 w-4" strokeWidth={1.5} />}
                                {theme === "dark" ? "Dark" : "Light"} mode
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.15em]">Toggle</span>
                        </button>
                        <div className="rounded-lg border border-border p-3">
                            <div className="label-eyebrow">Current cycle</div>
                            <div className="mt-1 font-display text-sm font-medium tracking-tight">{monthLabel(currentMonth)}</div>
                        </div>
                    </div>
                </aside>

                {/* Mobile top bar */}
                <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
                            <IndianRupee className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-display text-base font-medium tracking-tight">Ledger</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <SyncIndicator compact />
                        <NavLink
                            to="/settings"
                            data-testid="nav-settings-mobile"
                            className={({ isActive }) =>
                                `rounded-md border border-border p-2 transition-colors ${
                                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                }`
                            }
                            aria-label="Settings"
                        >
                            <Settings className="h-4 w-4" strokeWidth={1.5} />
                        </NavLink>
                        <button
                            data-testid="theme-toggle-mobile"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="rounded-md border border-border p-2 text-muted-foreground"
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Main content */}
                <main className="min-w-0 flex-1 px-4 pb-24 pt-20 md:px-10 md:pt-12 md:pb-16">
                    <div key={location.pathname} className="fade-up">
                        <Outlet />
                    </div>
                </main>

                {/* Mobile bottom nav */}
                <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-between border-t border-border bg-background/95 backdrop-blur px-2 py-2">
                    {NAV.slice(0, 5).map((n) => (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.end}
                            data-testid={`${n.testid}-mobile`}
                            className={({ isActive }) =>
                                `flex flex-1 flex-col items-center gap-1 rounded-md py-2 text-[10px] uppercase tracking-wider transition-colors ${
                                    isActive ? "text-foreground" : "text-muted-foreground"
                                }`
                            }
                        >
                            <n.icon className="h-4 w-4" strokeWidth={1.5} />
                            {n.label.split(" ")[0]}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    );
}
