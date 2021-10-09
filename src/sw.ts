import {
  handleFetchOnServiceWorker,
  handleMessageOnServiceWorker,
} from "./town";

const log = (...args: any) => console.log("[sw]", ...args);

const version = "8";

log("sw", version, Date.now());

self.addEventListener("install", (event: any) => {
  log("install", version);
  // @ts-ignore
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event: any) => {
  log("activate claim");
  // @ts-ignore
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event: any) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/__town")) {
    log("handle", "/__town");
    return event.respondWith(handleFetchOnServiceWorker(event));
  }
});
self.addEventListener("message", handleMessageOnServiceWorker);
