// export {};
// console.log("x");
// export {};

import Worker from "./worker?worker";
import { wrap, Remote } from "comlink";
import type { Api } from "./worker";

const api = wrap(new Worker()) as Remote<Api>;

const get = (url: string) => {
  console.log("get");
  api.sync();
};

async function main() {
  const _reg = await navigator.serviceWorker.register("/sw.js");
  const button = document.createElement("button");
  button.onclick = () => {
    const x = get("/sync");
  };
  button.textContent = "sync";
  document.body.appendChild(button);
}

main();
