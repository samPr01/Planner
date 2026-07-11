import React, { useMemo, useState } from "react";
import { useBudget } from "@/context/BudgetContext";
import { Panel, Eyebrow } from "@/components/ui-primitives";
import { fmtINR } from "@/lib/currency";
import { formatShortDate, todayISO } from "@/lib/dates";
import { CATEGORY_ICONS } from "@/lib/defaults";
import { Plus, Check, Pencil, Trash2, RotateCcw, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPES = [
    { key: "fixed", label: "Fixed" },
    { key: "variable", label: "Variable" },
    { key: "savings", label: "Savings" },
];

export default function Planned() {
    const s = useBudget();
    const [tab, setTab] = useState("fixed");
    const [editing, setEditing] = useState(null); // planned item
    const [open, setOpen] = useState(false);
    const [manageCat, setManageCat] = useState(false);

    const monthPlanned = s.plannedItems.filter((p) => p.monthKey === s.currentMonth);

    const grouped = useMemo(() => {
        return TYPES.reduce((acc, t) => {
            acc[t.key] = s.categories
                .filter((c) => c.type === t.key)
                .map((c) => ({ cat: c, items: monthPlanned.filter((p) => p.categoryId === c.id) }));
            return acc;
        }, {});
    }, [s.categories, monthPlanned]);

    const openNew = (categoryId) => {
        setEditing({ categoryId, amount: "", dueDate: "", reminderDate: "", reminderTime: "20:00", notes: "", priority: "Medium", recurring: true, name: "" });
        setOpen(true);
    };

    const openEdit = (item) => {
        setEditing({ ...item });
        setOpen(true);
    };

    const save = () => {
        if (!editing.amount || Number(editing.amount) <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        const payload = { ...editing, amount: Number(editing.amount) };
        if (editing.id) {
            s.updatePlannedItem(editing.id, payload);
            toast.success("Updated");
        } else {
            s.addPlannedItem(payload);
            toast.success("Added to planned budget");
        }
        setOpen(false);
        setEditing(null);
    };

    const markPaid = (item) => {
        s.markPlannedItemPaid(item.id, todayISO(), "");
        toast.success(`${item.name || "Payment"} marked as paid`);
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="label-eyebrow">Planned budget</div>
                    <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                        Structure your month
                    </h1>
                    <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                        Plan each category, set due dates and reminders. Mark items paid as you go — everything flows to your dashboard.
                    </p>
                </div>
                <Button data-testid="manage-categories-btn" variant="outline" onClick={() => setManageCat(true)} className="rounded-full">
                    Manage categories
                </Button>
            </header>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList data-testid="planned-tabs" className="bg-transparent p-0 gap-1">
                    {TYPES.map((t) => (
                        <TabsTrigger
                            key={t.key}
                            value={t.key}
                            data-testid={`tab-${t.key}`}
                            className="rounded-full border border-border px-4 py-2 text-sm data-[state=active]:bg-foreground data-[state=active]:text-background"
                        >
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {TYPES.map((t) => (
                    <TabsContent key={t.key} value={t.key} className="mt-6 space-y-4">
                        {grouped[t.key].map(({ cat, items }) => {
                            const Icon = CATEGORY_ICONS[cat.icon] || CATEGORY_ICONS.MoreHorizontal;
                            const totalPlanned = items.reduce((a, i) => a + Number(i.amount || 0), 0);
                            return (
                                <Panel key={cat.id} className="p-5" data-testid={`category-panel-${cat.id}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                                                <Icon className="h-4 w-4" strokeWidth={1.5} />
                                            </span>
                                            <div>
                                                <div className="font-display text-base font-medium tracking-tight">{cat.name}</div>
                                                <div className="text-xs text-muted-foreground">{items.length} planned · {fmtINR(totalPlanned)}</div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="rounded-full"
                                            data-testid={`add-planned-${cat.id}`}
                                            onClick={() => openNew(cat.id)}
                                        >
                                            <Plus className="h-4 w-4" /> Add
                                        </Button>
                                    </div>
                                    {items.length > 0 && (
                                        <div className="mt-4 space-y-2 border-t border-border pt-4">
                                            {items.map((i) => (
                                                <PlannedRow
                                                    key={i.id}
                                                    item={i}
                                                    onEdit={() => openEdit(i)}
                                                    onDelete={() => { s.deletePlannedItem(i.id); toast.success("Removed"); }}
                                                    onMarkPaid={() => markPaid(i)}
                                                    onUndo={() => { s.undoPlannedItemPaid(i.id); toast.success("Reverted"); }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </Panel>
                            );
                        })}
                    </TabsContent>
                ))}
            </Tabs>

            <PlannedDialog
                open={open}
                onOpenChange={setOpen}
                editing={editing}
                setEditing={setEditing}
                categories={s.categories}
                onSave={save}
            />
            <ManageCategoriesDialog open={manageCat} onOpenChange={setManageCat} />
        </div>
    );
}

function PlannedRow({ item, onEdit, onDelete, onMarkPaid, onUndo }) {
    const isPaid = item.status === "paid";
    const overdue = !isPaid && item.dueDate && item.dueDate < todayISO();
    return (
        <div
            data-testid={`planned-row-${item.id}`}
            className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/40",
                isPaid && "opacity-60"
            )}
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className={cn("truncate text-sm font-medium", isPaid && "line-through")}>{item.name || "Untitled"}</span>
                    {overdue && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-danger">Overdue</span>}
                    {isPaid && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-success">Paid</span>}
                    <PriorityBadge value={item.priority} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {item.dueDate && <span>Due {formatShortDate(item.dueDate)}</span>}
                    {item.reminderDate && <span className="inline-flex items-center gap-1"><Bell className="h-3 w-3" /> {formatShortDate(item.reminderDate)} {item.reminderTime}</span>}
                    {item.recurring && <span className="text-foreground/60">Recurring</span>}
                </div>
            </div>
            <div className="font-mono text-sm tabular">{fmtINR(item.amount)}</div>
            <div className="flex items-center gap-1">
                {!isPaid ? (
                    <Button size="sm" data-testid={`mark-paid-${item.id}`} onClick={onMarkPaid} className="rounded-full">
                        <Check className="mr-1 h-3.5 w-3.5" /> Mark paid
                    </Button>
                ) : (
                    <Button size="sm" variant="ghost" data-testid={`undo-paid-${item.id}`} onClick={onUndo}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Undo
                    </Button>
                )}
                <Button size="icon" variant="ghost" data-testid={`edit-planned-${item.id}`} onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" data-testid={`delete-planned-${item.id}`} onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
        </div>
    );
}

function PriorityBadge({ value }) {
    const tone = value === "High" ? "text-danger bg-danger/10" : value === "Low" ? "text-muted-foreground bg-muted" : "text-warning bg-warning/10";
    return <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider", tone)}>{value}</span>;
}

function PlannedDialog({ open, onOpenChange, editing, setEditing, categories, onSave }) {
    if (!editing) return null;
    const set = (k, v) => setEditing({ ...editing, [k]: v });
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid="planned-dialog" className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">
                        {editing.id ? "Edit planned item" : "New planned item"}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                    <div>
                        <Label className="label-eyebrow">Name</Label>
                        <Input data-testid="input-name" value={editing.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Landlord — flat 302" className="mt-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="label-eyebrow">Category</Label>
                            <Select value={editing.categoryId} onValueChange={(v) => set("categoryId", v)}>
                                <SelectTrigger data-testid="input-category" className="mt-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="label-eyebrow">Amount (₹)</Label>
                            <Input data-testid="input-amount" type="number" value={editing.amount} onChange={(e) => set("amount", e.target.value)} className="mt-2 font-mono tabular" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="label-eyebrow">Due date</Label>
                            <Input data-testid="input-due" type="date" value={editing.dueDate || ""} onChange={(e) => set("dueDate", e.target.value)} className="mt-2" />
                        </div>
                        <div>
                            <Label className="label-eyebrow">Priority</Label>
                            <Select value={editing.priority} onValueChange={(v) => set("priority", v)}>
                                <SelectTrigger data-testid="input-priority" className="mt-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="label-eyebrow">Reminder date</Label>
                            <Input data-testid="input-reminder-date" type="date" value={editing.reminderDate || ""} onChange={(e) => set("reminderDate", e.target.value)} className="mt-2" />
                        </div>
                        <div>
                            <Label className="label-eyebrow">Reminder time</Label>
                            <Input data-testid="input-reminder-time" type="time" value={editing.reminderTime || ""} onChange={(e) => set("reminderTime", e.target.value)} className="mt-2" />
                        </div>
                    </div>
                    <div>
                        <Label className="label-eyebrow">Notes</Label>
                        <Textarea data-testid="input-notes" rows={2} value={editing.notes || ""} onChange={(e) => set("notes", e.target.value)} className="mt-2" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <div>
                            <div className="text-sm font-medium">Recurring monthly</div>
                            <div className="text-xs text-muted-foreground">Auto-suggest next month</div>
                        </div>
                        <Switch data-testid="input-recurring" checked={!!editing.recurring} onCheckedChange={(v) => set("recurring", v)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button data-testid="save-planned-btn" onClick={onSave} className="rounded-full">Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ManageCategoriesDialog({ open, onOpenChange }) {
    const s = useBudget();
    const [name, setName] = useState("");
    const [type, setType] = useState("variable");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl tracking-tight">Manage categories</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                        <Input data-testid="new-cat-name" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger data-testid="new-cat-type" className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fixed">Fixed</SelectItem>
                                <SelectItem value="variable">Variable</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            data-testid="add-cat-btn"
                            onClick={() => {
                                if (!name.trim()) return;
                                s.addCategory({ name: name.trim(), type, icon: "MoreHorizontal" });
                                setName("");
                                toast.success("Category added");
                            }}
                            className="rounded-full"
                        >
                            Add
                        </Button>
                    </div>
                    <div className="max-h-80 space-y-1 overflow-auto">
                        {s.categories.map((c) => (
                            <div key={c.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/40">
                                <div className="text-sm">{c.name} <span className="ml-2 text-xs text-muted-foreground">· {c.type}</span></div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    data-testid={`delete-cat-${c.id}`}
                                    onClick={() => { s.deleteCategory(c.id); toast.success("Deleted"); }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
