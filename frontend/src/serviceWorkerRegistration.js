// Register the service worker for offline PWA support.
export function register() {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // only in prod builds
    window.addEventListener("load", () => {
        const swUrl = `${process.env.PUBLIC_URL || ""}/service-worker.js`;
        navigator.serviceWorker
            .register(swUrl)
            .then((reg) => {
                reg.onupdatefound = () => {
                    const installing = reg.installing;
                    if (!installing) return;
                    installing.onstatechange = () => {
                        if (installing.state === "installed" && navigator.serviceWorker.controller) {
                            // New content is available; will be used on next reload
                            console.info("New content available; refresh to update.");
                        }
                    };
                };
            })
            .catch((err) => console.warn("SW registration failed:", err));
    });
}

export function unregister() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => reg.unregister()).catch(() => {});
}
