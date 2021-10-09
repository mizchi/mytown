/** @jsx h */

import { expose } from "comlink";
import { stubDocumentOnWorker } from "./town";
import { h, render } from "preact";
import { useEffect, useState } from "preact/hooks";

function App() {
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    setInterval(() => {
      setCounter((n) => n + 1);
    }, 1000);
  }, []);
  return (
    <div>
      Hello,
      {counter}
    </div>
  );
}

const api = {
  start() {
    stubDocumentOnWorker();
    const el = document.createElement("div");
    render(<App />, el);
    document.body.appendChild(el);
  },
};

export type Api = typeof api;

expose(api);
