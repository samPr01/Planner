import React, { useMemo, useState } from "react";
import { useBudget } from "@/context/BudgetContext";
import { Panel, Eyebrow } from "@/components/ui-primitives";
import { fmtINR } from "@/lib/currency";
import { formatShortDate, monthLabel } from "@/lib/dates";
import { Search, Trash2, Pencil, ArrowDownUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function History() {
    const s = useBudget();
    const [q, setQ] = useState("");
    const [month, setMonth] = useState(s.currentMonth);
    const [category, setCategory] = useState("all");
    const [sort, setSort] = useState("date-desc");
    const [editing, setEditing] = useState(null);
    const [openAdd, setOpenAdd] = useState(false);

    const months = useMemo(() => {
        const set = new Set([s.currentMonth, ...s.transactions.map((t) => t.date?.slice(0, 7)).filter(Boolean)]);
        return Array.from(set).sort().reverse();
    }, [s.transactions, s.currentMonth]);

    const filtered = useMemo(() => {
        let list = s.transactions.filter((t) => {
            if (month !== "all" && !t.date?.startsWith(month)) return false;
            if (category !== "all" && t.categoryId !== category) return false;
            if (q && !(t.name?.toLowerCase().includes(q.toLowerCase()) || t.remarks?.toLowerCase().includes(q.toLowerCase()))) return false;
            return true;
        });
        list = [...list].sort((a, b) => {
            if (sort === "date-desc") return b.date.localeCompare(a.date);
            if (sort === "date-asc") return a.date.localeCompare(b.date);
            if (sort === "amount-desc") return b.amount - a.amount;
            return a.amount - b.amount;
        });
        return list;
    }, [s.transactions, month, category, q, sort]);

    const total = filtered.reduce((a, t) => a + t.amount, 0);

    return (
        <div className="space-y-6">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <div className="label-eyebrow">Expense history</div>
                    <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                        Every rupee, accounted for
                    </h1>
                </div>
                <Button data-testid="add-expense-btn" onClick={() => setOpenAdd(true)} className="self-start rounded-full">
                    <Plus className="mr-1 h-4 w-4" /> Log expense
                </Button>
            </header>

            <Panel className="p-4 md:p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input data-testid="history-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or remarks…" className="pl-9" />
                    </div>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger data-testid="history-month" className="w-full md:w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All months</SelectItem>
                            {months.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger data-testid="history-category" className="w-full md:w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {s.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={sort} onValueChange={setSort}>
                        <SelectTrigger data-testid="history-sort" className="w-full md:w-44">
                            <ArrowDownUp className="h-3.5 w-3.5" /><SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date-desc">Newest first</SelectItem>
                            <SelectItem value="date-asc">Oldest first</SelectItem>
                            <SelectItem value="amount-desc">Highest amount</SelectItem>
                            <SelectItem value="amount-asc">Lowest amount</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">{filtered.length} transactions</span>
                    <span className="font-mono tabular">Total: {fmtINR(total)}</span>
                </div>
            </Panel>

            <Panel className="p-0" data-testid="history-list">
                {filtered.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">No transactions match your filters.</div>
                ) : (
                    <div className="divide-y divide-border">
                        {filtered.map((t) => {
                            const cat = s.categories.find((c) => c.id === t.categoryId);
                            return (
                                <div key={t.id} data-testid={`history-row-${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-accent/30">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">{t.name}</div>
                                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{formatShortDate(t.date)}</span>
                                            {cat && <span>· {cat.name}</span>}
                                            {t.type === "saving" && <span className="text-success">· Savings</span>}
                                            {t.remarks && <span className="italic">· {t.remarks}</span>}
                                        </div>
                                    </div>
                                    <div className="font-mono text-sm tabular">{fmtINR(t.amount)}</div>
                                    <div className="flex items-center gap-1">
                                        <Button size="icon" variant="ghost" data-testid={`edit-tx-${t.id}`} onClick={() => setEditing({ ...t })}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" data-testid={`delete-tx-${t.id}`} onClick={() => { s.deleteTransaction(t.id); toast.success("Deleted"); }}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Panel>

            <TxDialog
                open={openAdd}
                onOpenChange={setOpenAdd}
                onSave={(data) => { s.addTransaction(data); toast.success("Expense logged"); setOpenAdd(false); }}
                categories={s.categories}
            />
            <TxDialog
                open={!!editing}
                onOpenChange={(o) => !o && setEditing(null)}
                initial={editing}
                onSave={(data) => { s.updateTransaction(editing.id, data); toast.success("Updated"); setEditing(null); }}
                categories={s.categories}
            />
        </div>
    );
}

function TxDialog({ open, onOpenChange, onSave, initial, categories }) {
    const [d, setD] = useState({ name: "", amount: "", categoryId: categories[0]?.id, date: new Date().toISOString().slice(0, 10), remarks: "", type: "expense" });
    React.useEffect(() => {
        if (open) setD(initial ? { ...initial } : { name: "", amount: "", categoryId: categories[0]?.id, date: new Date().toISOString().slice(0, 10), remarks: "", type: "expense" });
    }, [open, initial, categories]);
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">{initial ? "Edit" : "New"} expense</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                    <div>
                        <Label className="label-eyebrow">Name</Label>
                        <Input data-testid="tx-name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className="mt-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="label-eyebrow">Amount (₹)</Label>
                            <Input data-testid="tx-amount" type="number" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} className="mt-2 font-mono tabular" />
                        </div>
                        <div>
                            <Label className="label-eyebrow">Date</Label>
                            <Input data-testid="tx-date" type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} className="mt-2" />
                        </div>
                    </div>
                    <div>
                        <Label className="label-eyebrow">Category</Label>
                        <Select value={d.categoryId} onValueChange={(v) => setD({ ...d, categoryId: v })}>
                            <SelectTrigger data-testid="tx-category" className="mt-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="label-eyebrow">Remarks</Label>
                        <Textarea data-testid="tx-remarks" rows={2} value={d.remarks} onChange={(e) => setD({ ...d, remarks: e.target.value })} className="mt-2" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        data-testid="tx-save-btn"
                        onClick={() => {
                            if (!d.amount || Number(d.amount) <= 0) return toast.error("Enter amount");
                            const cat = categories.find((c) => c.id === d.categoryId);
                            const payload = { ...d, amount: Number(d.amount), type: cat?.type === "savings" ? "saving" : "expense" };
                            onSave(payload);
                        }}
                        className="rounded-full"
                    >
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
