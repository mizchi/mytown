import { expose } from "comlink";
import { stubWorkerDocument } from "./town";

const log = (...args: any) => console.log("[worker]", ...args);

const api = {
  start() {
    stubWorkerDocument();
    log(document.body.textContent);
  },
};

export type Api = typeof api;

expose(api);
