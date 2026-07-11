import React, { useState, useMemo } from "react";
import { useBudget } from "@/context/BudgetContext";
import { Panel, Eyebrow } from "@/components/ui-primitives";
import { fmtINR } from "@/lib/currency";
import { daysInMonth, monthLabel, todayISO, formatFullDate } from "@/lib/dates";
import { CATEGORY_ICONS } from "@/lib/defaults";
import { ChevronLeft, ChevronRight, Check, Clock, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CalendarView() {
    const s = useBudget();
    const [mk, setMk] = useState(s.currentMonth);
    const [selected, setSelected] = useState(null);

    const [y, mo] = mk.split("-").map(Number);
    const firstDay = new Date(y, mo - 1, 1).getDay();
    const dim = daysInMonth(mk);
    const cells = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: dim }, (_, i) => `${mk}-${String(i + 1).padStart(2, "0")}`),
    ];

    const eventsByDate = useMemo(() => {
        const map = {};
        s.plannedItems.forEach((p) => {
            if (!p.dueDate) return;
            (map[p.dueDate] = map[p.dueDate] || []).push(p);
        });
        return map;
    }, [s.plannedItems]);

    const navigate = (delta) => {
        const d = new Date(y, mo - 1 + delta, 1);
        setMk(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    };

    const eventsForSelected = selected ? eventsByDate[selected] || [] : [];

    return (
        <div className="space-y-6">
            <header className="flex items-end justify-between">
                <div>
                    <div className="label-eyebrow">Calendar</div>
                    <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                        {monthLabel(mk)}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" data-testid="cal-prev" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" data-testid="cal-next" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </header>

            <Panel className="p-4 md:p-6" data-testid="calendar-grid">
                <div className="grid grid-cols-7 gap-1 border-b border-border pb-2 text-center text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1">
                    {cells.map((iso, i) => {
                        if (!iso) return <div key={i} className="aspect-square" />;
                        const events = eventsByDate[iso] || [];
                        const isToday = iso === todayISO();
                        return (
                            <button
                                key={iso}
                                data-testid={`cal-cell-${iso}`}
                                onClick={() => setSelected(iso)}
                                className={cn(
                                    "aspect-square flex-col rounded-lg border border-transparent p-1.5 text-left transition-all hover:border-border hover:bg-accent/40 sm:p-2",
                                    isToday && "border-foreground/40 bg-accent/30"
                                )}
                            >
                                <div className={cn("text-xs font-medium tabular font-mono", isToday && "text-foreground")}>
                                    {Number(iso.split("-")[2])}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-0.5">
                                    {events.slice(0, 3).map((e) => {
                                        const overdue = e.status !== "paid" && iso < todayISO();
                                        const color = e.status === "paid" ? "bg-success" : overdue ? "bg-danger" : "bg-warning";
                                        return <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", color)} />;
                                    })}
                                    {events.length > 3 && <span className="text-[9px] text-muted-foreground">+{events.length - 3}</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Paid</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Upcoming</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" /> Overdue</span>
                </div>
            </Panel>

            <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-xl tracking-tight">
                            {selected ? formatFullDate(selected) : ""}
                        </DialogTitle>
                    </DialogHeader>
                    {eventsForSelected.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No payments due.</div>
                    ) : (
                        <div className="space-y-2">
                            {eventsForSelected.map((p) => {
                                const cat = s.categories.find((c) => c.id === p.categoryId);
                                const Icon = cat && CATEGORY_ICONS[cat.icon] ? CATEGORY_ICONS[cat.icon] : Clock;
                                const overdue = p.status !== "paid" && p.dueDate < todayISO();
                                const StatusIcon = p.status === "paid" ? Check : overdue ? AlertCircle : Clock;
                                const tone = p.status === "paid" ? "text-success" : overdue ? "text-danger" : "text-warning";
                                return (
                                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                                                <Icon className="h-4 w-4" strokeWidth={1.5} />
                                            </span>
                                            <div>
                                                <div className="text-sm font-medium">{p.name || cat?.name}</div>
                                                <div className={cn("mt-0.5 flex items-center gap-1 text-xs", tone)}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {p.status === "paid" ? "Paid" : overdue ? "Overdue" : "Upcoming"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-mono text-sm tabular">{fmtINR(p.amount)}</div>
                                            {p.status !== "paid" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => { s.markPlannedItemPaid(p.id, todayISO(), ""); toast.success("Marked paid"); setSelected(null); }}
                                                    className="rounded-full"
                                                >
                                                    Pay
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
