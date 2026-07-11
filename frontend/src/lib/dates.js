// Date utilities for month keys and calendar operations
export function currentMonthKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

export function monthLabel(key) {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function daysInMonth(key) {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m, 0).getDate();
}

export function daysLeftInMonth(key, today = new Date()) {
    const total = daysInMonth(key);
    const [y, m] = key.split("-").map(Number);
    const cur = today.getFullYear() === y && today.getMonth() + 1 === m ? today.getDate() : 1;
    return Math.max(0, total - cur);
}

export function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKeyFromISO(iso) {
    return iso?.slice(0, 7);
}

export function formatShortDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatFullDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function weekOfMonth(iso) {
    const d = new Date(iso);
    return Math.ceil(d.getDate() / 7);
}

export function getMonthDays(key) {
    const [y, m] = key.split("-").map(Number);
    const days = daysInMonth(key);
    return Array.from({ length: days }, (_, i) => toISO(new Date(y, m - 1, i + 1)));
}

export function isPast(iso) {
    return iso < todayISO();
}

export function isToday(iso) {
    return iso === todayISO();
}
