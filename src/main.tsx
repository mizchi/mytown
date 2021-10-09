import Worker from "./worker?worker";
import { wrap, Remote } from "comlink";
import type { Api } from "./worker";
import { handleMessageOnMain } from "./town";

const api = wrap(new Worker()) as Remote<Api>;

async function main() {
  const _reg = await navigator.serviceWorker.register("/sw.js");
  navigator.serviceWorker.addEventListener("message", handleMessageOnMain);
  const postButton = document.createElement("button");
  postButton.onclick = () => {
    api.start();
  };
  postButton.textContent = "start";
  document.body.appendChild(postButton);
}

main();
