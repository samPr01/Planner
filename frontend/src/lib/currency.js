// INR currency formatting utilities
const INR = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

const INR_PRECISE = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
});

export function fmtINR(amount, precise = false) {
    const n = Number(amount) || 0;
    return (precise ? INR_PRECISE : INR).format(n);
}

export function fmtINRShort(amount) {
    const n = Math.abs(Number(amount) || 0);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
    return `₹${n}`;
}

export function fmtNumber(n) {
    return new Intl.NumberFormat("en-IN").format(Number(n) || 0);
}
