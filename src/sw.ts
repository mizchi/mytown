// import { url } from "inspector";

export {};
declare const clients: any;

const log = (...args: any) => console.log("[sw]", ...args);

const version = "7";

log("sw", version, Date.now());

self.addEventListener("install", (event: any) => {
  log("install", version);
});

self.addEventListener("activate", (event: any) => {
  log("activate claim");
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event: any) => {
  const req = event.request as Request;
  const url = new URL(req.url);
  log("fetch:", req.url);
  if (url.pathname === "/__town") {
    log("/sync!");
    return event.respondWith(handler(req));
  }
});

async function handler(req: Request) {
  // console.log("");
  return new Response("hello");
}
