// Browser Notification helpers
export function isNotificationSupported() {
    return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission() {
    if (!isNotificationSupported()) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return await Notification.requestPermission();
}

export function sendBrowserNotification(title, body) {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== "granted") return;
    try {
        // eslint-disable-next-line no-new
        new Notification(title, { body, icon: "/favicon.ico", silent: false });
    } catch (e) {
        console.warn("Notification failed", e);
    }
}
