/* Keeps the Video Studio working offline once it has been opened. It only handles the studio and its own files. */
const VERSION = "studio-v1";
const SHELL = ["/tools/studio"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // The studio page: network first, so updates arrive, and the saved copy when offline.
  if (req.mode === "navigate" && url.pathname.startsWith("/tools/studio")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("/tools/studio", copy));
          return res;
        })
        .catch(() => caches.match("/tools/studio").then((r) => r || Response.error())),
    );
    return;
  }

  // Built files have a fingerprint in their name, so a saved copy never goes stale.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/studio/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
