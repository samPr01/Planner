import React, { useMemo } from "react";
import { useBudget, useMonthMetrics } from "@/context/BudgetContext";
import { Panel, Eyebrow, ProgressBar, Ring } from "@/components/ui-primitives";
import { fmtINR, fmtINRShort } from "@/lib/currency";
import { daysInMonth, daysLeftInMonth, monthLabel, todayISO, formatShortDate } from "@/lib/dates";
import { ArrowUpRight, Bell, Check, Clock, TrendingDown, TrendingUp, Wallet, PiggyBank, CalendarDays } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, LineChart, Line, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { CATEGORY_ICONS } from "@/lib/defaults";
import { Button } from "@/components/ui/button";

const CHART_COLORS = ["hsl(var(--foreground))", "hsl(var(--muted-foreground))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--danger))", "#6B7280", "#374151"];

export default function Dashboard() {
    const s = useBudget();
    const m = useMonthMetrics();
    const today = todayISO();

    const flexibleTone = m.flexibleUsedPct >= 100 ? "danger" : m.flexibleUsedPct >= 80 ? "warning" : "safe";

    const upcoming = useMemo(
        () =>
            m.monthPlanned
                .filter((p) => p.status !== "paid" && p.dueDate)
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 5),
        [m.monthPlanned]
    );

    const todayReminders = useMemo(
        () => m.monthPlanned.filter((p) => p.reminderDate === today && p.status !== "paid"),
        [m.monthPlanned, today]
    );

    const recentPaid = useMemo(
        () => m.monthTxs.filter((t) => t.type === "expense").slice(0, 5),
        [m.monthTxs]
    );

    const donutData = useMemo(() => {
        const map = {};
        m.monthTxs.forEach((t) => {
            const cat = s.categories.find((c) => c.id === t.categoryId);
            if (!cat) return;
            map[cat.name] = (map[cat.name] || 0) + t.amount;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [m.monthTxs, s.categories]);

    const weeklyData = useMemo(() => {
        const dim = daysInMonth(m.mk);
        const weeks = [0, 0, 0, 0, 0];
        m.monthTxs
            .filter((t) => t.type === "expense")
            .forEach((t) => {
                const d = Number(t.date.split("-")[2]);
                const w = Math.min(4, Math.floor((d - 1) / 7));
                weeks[w] += t.amount;
            });
        return weeks.map((v, i) => ({ week: `W${i + 1}`, amount: v })).slice(0, dim > 28 ? 5 : 4);
    }, [m.monthTxs, m.mk]);

    const trendData = useMemo(() => {
        // last 6 months
        const [y, mo] = m.mk.split("-").map(Number);
        const arr = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(y, mo - 1 - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const total = s.transactions
                .filter((t) => t.date?.startsWith(key) && t.type === "expense")
                .reduce((a, t) => a + t.amount, 0);
            arr.push({ month: d.toLocaleDateString("en-IN", { month: "short" }), value: total });
        }
        return arr;
    }, [s.transactions, m.mk]);

    const daysGone = new Date().getDate();
    const rec = m.budget > 0 && daysGone > 0
        ? Math.max(0, (m.budget - m.totalSpent - m.totalSavingsAllocated) / Math.max(1, daysLeftInMonth(m.mk)))
        : 0;

    return (
        <div className="space-y-8" data-testid="dashboard-root">
            {/* Header */}
            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="label-eyebrow">{monthLabel(m.mk)}</div>
                    <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
                        Good {getGreeting()}. Here&apos;s your money.
                    </h1>
                </div>
                <Link
                    to="/planned"
                    data-testid="cta-plan-month"
                    className="inline-flex items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                    Plan this month <ArrowUpRight className="h-4 w-4" />
                </Link>
            </header>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
                {/* Hero budget */}
                <Panel className="hero-noise relative overflow-hidden md:col-span-4 md:row-span-2">
                    <div className="flex items-start justify-between">
                        <Eyebrow>Remaining balance</Eyebrow>
                        <BudgetEditor budget={m.budget} onSave={(v) => s.setBudget(m.mk, v)} />
                    </div>
                    <div className="mt-6">
                        <div
                            className="font-mono text-5xl font-light tracking-tight tabular sm:text-6xl md:text-7xl"
                            data-testid="hero-remaining"
                        >
                            {fmtINR(m.remaining)}
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground">
                            of <span className="text-foreground tabular">{fmtINR(m.budget)}</span> monthly budget
                        </div>
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
                        <MiniStat label="Spent" value={m.totalSpent} icon={TrendingDown} />
                        <MiniStat label="Savings" value={m.totalSavingsAllocated} icon={PiggyBank} />
                        <MiniStat label="Days left" value={daysLeftInMonth(m.mk)} isPlain icon={CalendarDays} />
                        <MiniStat label="Suggested daily" value={rec} icon={Wallet} />
                    </div>
                </Panel>

                {/* Utilization ring */}
                <Panel className="flex flex-col items-center justify-center md:col-span-2">
                    <Eyebrow className="self-start">Budget utilization</Eyebrow>
                    <div className="mt-4">
                        <Ring
                            value={m.utilization}
                            label={`${Math.round(m.utilization)}%`}
                            sublabel="used"
                            tone={m.utilization >= 90 ? "danger" : m.utilization >= 75 ? "warning" : "primary"}
                        />
                    </div>
                </Panel>

                {/* Flexible spending */}
                <Panel className="md:col-span-2" data-testid="flexible-panel">
                    <Eyebrow>Flexible spending</Eyebrow>
                    <div
                        className={`mt-4 font-mono text-3xl font-light tabular tracking-tight ${flexibleTone === "danger" ? "text-danger" : flexibleTone === "warning" ? "text-warning" : ""}`}
                        data-testid="flexible-remaining"
                    >
                        {fmtINR(m.flexibleRemaining)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        of {fmtINR(m.flexibleTotal)} available
                    </div>
                    <div className="mt-5">
                        <ProgressBar value={m.flexibleUsedPct} tone={flexibleTone} />
                        <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Used {Math.round(m.flexibleUsedPct)}%</span>
                            {flexibleTone === "danger" && <span className="text-danger">Over budget</span>}
                            {flexibleTone === "warning" && <span className="text-warning">Approaching limit</span>}
                        </div>
                    </div>
                </Panel>

                {/* Expense breakdown */}
                <Panel className="md:col-span-4">
                    <div className="flex items-center justify-between">
                        <Eyebrow>Expense breakdown</Eyebrow>
                        <span className="text-xs text-muted-foreground">By category</span>
                    </div>
                    {donutData.length === 0 ? (
                        <EmptyChart label="No expenses yet this month" />
                    ) : (
                        <div className="mt-4 grid grid-cols-1 items-center gap-4 md:grid-cols-2">
                            <div className="relative h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={donutData} innerRadius={62} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                                            {donutData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v) => fmtINR(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="label-eyebrow">Total</div>
                                    <div className="mt-1 font-mono text-lg font-medium tabular">{fmtINRShort(m.totalSpent)}</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {donutData.slice(0, 6).map((d, i) => (
                                    <div key={d.name} className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            {d.name}
                                        </span>
                                        <span className="font-mono tabular">{fmtINR(d.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Panel>

                {/* Weekly bar */}
                <Panel className="md:col-span-2">
                    <Eyebrow>Weekly spending</Eyebrow>
                    <div className="mt-4 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                                <YAxis hide />
                                <Tooltip formatter={(v) => fmtINR(v)} cursor={{ fill: "hsl(var(--accent))" }} />
                                <Bar dataKey="amount" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                {/* 6-month trend */}
                <Panel className="md:col-span-3">
                    <div className="flex items-center justify-between">
                        <Eyebrow>Spending trend</Eyebrow>
                        <span className="text-xs text-muted-foreground">Last 6 months</span>
                    </div>
                    <div className="mt-4 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                <YAxis hide />
                                <Tooltip formatter={(v) => fmtINR(v)} />
                                <Line type="monotone" dataKey="value" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--foreground))" }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                {/* Upcoming payments */}
                <Panel className="md:col-span-3">
                    <div className="flex items-center justify-between">
                        <Eyebrow>Upcoming payments</Eyebrow>
                        <Link to="/planned" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
                    </div>
                    <div className="mt-4 space-y-3">
                        {upcoming.length === 0 && <EmptyState label="Nothing scheduled." />}
                        {upcoming.map((p) => {
                            const cat = s.categories.find((c) => c.id === p.categoryId);
                            const Icon = cat && CATEGORY_ICONS[cat.icon] ? CATEGORY_ICONS[cat.icon] : Clock;
                            return (
                                <div key={p.id} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-muted-foreground">
                                            <Icon className="h-4 w-4" strokeWidth={1.5} />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">{p.name || cat?.name}</div>
                                            <div className="text-xs text-muted-foreground">Due {formatShortDate(p.dueDate)}</div>
                                        </div>
                                    </div>
                                    <div className="font-mono text-sm tabular">{fmtINR(p.amount)}</div>
                                </div>
                            );
                        })}
                    </div>
                </Panel>

                {/* Reminders + recently paid */}
                <Panel className="md:col-span-3">
                    <div className="flex items-center justify-between">
                        <Eyebrow>Today&apos;s reminders</Eyebrow>
                        <Bell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="mt-3 space-y-2">
                        {todayReminders.length === 0 && <EmptyState label="No reminders due today." />}
                        {todayReminders.map((p) => (
                            <div key={p.id} className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{p.name}</span>
                                    <span className="font-mono tabular text-warning">{fmtINR(p.amount)}</span>
                                </div>
                                {p.reminderTime && <div className="text-xs text-muted-foreground">at {p.reminderTime}</div>}
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <Eyebrow>Recently paid</Eyebrow>
                        <div className="mt-3 space-y-2">
                            {recentPaid.length === 0 && <EmptyState label="Nothing paid yet this month." />}
                            {recentPaid.map((t) => (
                                <div key={t.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Check className="h-3.5 w-3.5 text-success" />
                                        <span className="text-foreground">{t.name}</span>
                                        <span className="text-xs">· {formatShortDate(t.date)}</span>
                                    </div>
                                    <span className="font-mono tabular">{fmtINR(t.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 18) return "afternoon";
    return "evening";
}

function MiniStat({ label, value, icon: Icon, isPlain }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 label-eyebrow">
                {Icon && <Icon className="h-3 w-3" strokeWidth={1.5} />}
                {label}
            </div>
            <div className="mt-2 font-mono text-lg font-medium tabular tracking-tight">
                {isPlain ? value : fmtINR(value)}
            </div>
        </div>
    );
}

function EmptyState({ label }) {
    return <div className="text-sm text-muted-foreground">{label}</div>;
}

function EmptyChart({ label }) {
    return (
        <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            {label}
        </div>
    );
}

function BudgetEditor({ budget, onSave }) {
    const [open, setOpen] = React.useState(false);
    const [val, setVal] = React.useState(budget);
    React.useEffect(() => setVal(budget), [budget]);
    if (!open) {
        return (
            <button
                data-testid="edit-budget-btn"
                onClick={() => setOpen(true)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
                {budget > 0 ? "Edit budget" : "Set budget"}
            </button>
        );
    }
    return (
        <div className="flex items-center gap-2">
            <input
                data-testid="budget-input"
                type="number"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-32 rounded-md border border-border bg-transparent px-2 py-1 text-right font-mono text-sm tabular focus:border-foreground focus:outline-none"
                autoFocus
            />
            <Button
                data-testid="save-budget-btn"
                size="sm"
                onClick={() => { onSave(val); setOpen(false); }}
                className="rounded-full"
            >
                Save
            </Button>
        </div>
    );
}
