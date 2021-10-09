import { expose } from "comlink";
import { stubDocumentOnWorker } from "./town";

const log = (...args: any) => console.log("[worker]", ...args);

const api = {
  start() {
    stubDocumentOnWorker();
    log(document.body.textContent);
  },
};

export type Api = typeof api;

expose(api);
