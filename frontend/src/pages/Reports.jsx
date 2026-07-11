import React, { useMemo } from "react";
import { useBudget, useMonthMetrics } from "@/context/BudgetContext";
import { Panel, Eyebrow, ProgressBar } from "@/components/ui-primitives";
import { fmtINR } from "@/lib/currency";
import { daysInMonth, monthLabel } from "@/lib/dates";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from "recharts";

const CHART_COLORS = ["hsl(var(--foreground))", "hsl(var(--muted-foreground))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--danger))", "#6B7280", "#374151", "#9CA3AF"];

export default function Reports() {
    const s = useBudget();
    const m = useMonthMetrics();

    const dim = daysInMonth(m.mk);
    const daysPast = Math.min(dim, new Date().getDate());
    const avgDaily = daysPast > 0 ? m.totalSpent / daysPast : 0;
    const highest = useMemo(() => {
        const map = {};
        m.monthTxs.forEach((t) => {
            const c = s.categories.find((c) => c.id === t.categoryId);
            if (!c) return;
            map[c.name] = (map[c.name] || 0) + t.amount;
        });
        const arr = Object.entries(map).sort((a, b) => b[1] - a[1]);
        return arr;
    }, [m.monthTxs, s.categories]);

    const donutData = highest.slice(0, 8).map(([name, value]) => ({ name, value }));

    const pending = m.monthPlanned.filter((p) => p.status !== "paid").length;

    const trend = useMemo(() => {
        const [y, mo] = m.mk.split("-").map(Number);
        return Array.from({ length: 6 }, (_, i) => {
            const d = new Date(y, mo - 6 + i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const spent = s.transactions.filter((t) => t.date?.startsWith(key) && t.type === "expense").reduce((a, t) => a + t.amount, 0);
            const saved = s.transactions.filter((t) => t.date?.startsWith(key) && t.type === "saving").reduce((a, t) => a + t.amount, 0);
            return { month: d.toLocaleDateString("en-IN", { month: "short" }), Spent: spent, Saved: saved };
        });
    }, [s.transactions, m.mk]);

    const dailyLine = useMemo(() => {
        const arr = Array.from({ length: dim }, (_, i) => ({ day: i + 1, amount: 0 }));
        m.monthTxs.filter((t) => t.type === "expense").forEach((t) => {
            const d = Number(t.date.split("-")[2]);
            if (arr[d - 1]) arr[d - 1].amount += t.amount;
        });
        return arr;
    }, [m.monthTxs, dim]);

    const budgetVsActual = useMemo(() => {
        return s.categories.map((c) => {
            const planned = m.monthPlanned.filter((p) => p.categoryId === c.id).reduce((a, p) => a + Number(p.amount || 0), 0);
            const actual = m.monthTxs.filter((t) => t.categoryId === c.id).reduce((a, t) => a + t.amount, 0);
            return { name: c.name, Planned: planned, Actual: actual };
        }).filter((r) => r.Planned > 0 || r.Actual > 0).slice(0, 8);
    }, [s.categories, m.monthPlanned, m.monthTxs]);

    return (
        <div className="space-y-8">
            <header>
                <div className="label-eyebrow">Reports & analytics</div>
                <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                    {monthLabel(m.mk)} in review
                </h1>
            </header>

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi label="Budget" value={fmtINR(m.budget)} />
                <Kpi label="Spent" value={fmtINR(m.totalSpent)} tone="danger" />
                <Kpi label="Saved" value={fmtINR(m.totalSavingsAllocated)} tone="success" />
                <Kpi label="Remaining" value={fmtINR(m.remaining)} tone="primary" />
                <Kpi label="Flexible left" value={fmtINR(m.flexibleRemaining)} />
                <Kpi label="Utilization" value={`${Math.round(m.utilization)}%`} />
                <Kpi label="Avg daily" value={fmtINR(avgDaily)} />
                <Kpi label="Pending payments" value={pending} />
            </div>

            {/* Category breakdown */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Panel className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <Eyebrow>Category distribution</Eyebrow>
                        <span className="text-xs text-muted-foreground">Highest: {highest[0]?.[0] || "—"}</span>
                    </div>
                    {donutData.length === 0 ? (
                        <Empty label="No data" />
                    ) : (
                        <div className="mt-4 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={donutData} innerRadius={64} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                                            {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(v) => fmtINR(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div>
                                <div className="label-eyebrow mb-3">Top 5 categories</div>
                                <div className="space-y-3">
                                    {highest.slice(0, 5).map(([name, v], i) => {
                                        const max = highest[0]?.[1] || 1;
                                        return (
                                            <div key={name}>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span>{name}</span>
                                                    <span className="font-mono tabular">{fmtINR(v)}</span>
                                                </div>
                                                <ProgressBar value={(v / max) * 100} className="mt-2" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </Panel>

                <Panel>
                    <Eyebrow>Savings envelopes</Eyebrow>
                    <div className="mt-4 space-y-3">
                        {s.categories.filter((c) => c.type === "savings").map((c) => {
                            const saved = s.transactions.filter((t) => t.categoryId === c.id && t.type === "saving").reduce((a, t) => a + t.amount, 0);
                            const monthly = m.monthPlanned.find((p) => p.categoryId === c.id)?.amount || 0;
                            return (
                                <div key={c.id} className="rounded-lg border border-border p-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{c.name}</span>
                                        <span className="font-mono tabular text-success">{fmtINR(saved)}</span>
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">Monthly: {fmtINR(monthly)}</div>
                                </div>
                            );
                        })}
                    </div>
                </Panel>
            </div>

            {/* Trend & Daily */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel>
                    <Eyebrow>Spent vs Saved · Trend</Eyebrow>
                    <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                <Tooltip formatter={(v) => fmtINR(v)} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="Spent" fill="hsl(var(--foreground))" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="Saved" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                <Panel>
                    <Eyebrow>Daily spending timeline</Eyebrow>
                    <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyLine} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                <Tooltip formatter={(v) => fmtINR(v)} labelFormatter={(l) => `Day ${l}`} />
                                <Line type="monotone" dataKey="amount" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
            </div>

            {/* Budget vs Actual */}
            <Panel>
                <Eyebrow>Budget vs Actual (by category)</Eyebrow>
                {budgetVsActual.length === 0 ? (
                    <Empty label="No planned data" />
                ) : (
                    <div className="mt-4 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={budgetVsActual} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                <Tooltip formatter={(v) => fmtINR(v)} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="Planned" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="Actual" fill="hsl(var(--foreground))" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Panel>
        </div>
    );
}

function Kpi({ label, value, tone }) {
    const color = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "";
    return (
        <Panel className="p-5">
            <div className="label-eyebrow">{label}</div>
            <div className={`mt-2 font-mono text-xl font-medium tabular tracking-tight ${color}`}>{value}</div>
        </Panel>
    );
}

function Empty({ label }) {
    return <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">{label}</div>;
}
