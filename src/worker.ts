import { expose } from "comlink";

const log = (...args: any) => console.log("[worker]", ...args);

const fetchSync = (url: string) => {
  // log("sync");
  let result: any;
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.onload = (_e) => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        result = xhr.responseText;
      } else {
        throw new Error("failed");
      }
    }
  };
  xhr.onerror = (_e) => console.error(xhr.statusText);
  xhr.send(null);
  return result;
};

const api = {
  sync() {
    const data = fetchSync("/__town");
    log("sync fetch", data);
  },
};

export type Api = typeof api;

expose(api);

/*

2008 b1
2009 b2
2010 b3
2011 b4
2012 3
*/
