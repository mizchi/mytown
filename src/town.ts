export type RemoteCommand =
  | {
      op: "apply";
      paths: string[];
      args: any[];
    }
  | {
      op: "access";
      paths: string[];
    }
  | {
      op: "call";
      paths: string[];
    };

export type RequestPayload = {
  type: "req";
  id: number;
  cmd: RemoteCommand;
};

export type ResponsePayload = {
  type: "res";
  id: number;
  value: any;
};

export type RemoteObject<T> = T & {
  _id: any;
  _value: any;
};

export function resolveCommandOnMain(command: RemoteCommand) {
  if (command.op === "access") {
    return command.paths.reduce((acc, next) => acc[next], globalThis as any);
  }
}

export function handleMessageOnMain(event: MessageEvent) {
  if (event.data.type === "req") {
    const req = event.data as RequestPayload;
    navigator.serviceWorker.controller!.postMessage({
      type: "res",
      id: req.id,
      value: resolveCommandOnMain(req.cmd),
    } as ResponsePayload);
  }
}

export function element(root: any = globalThis, paths: string[] = []): any {
  return new Proxy(() => {}, {
    apply(_target, _thisArg, argumentsList) {
      let caller = null;
      const realValue = paths.reduce((acc: any, attr) => {
        caller = acc;
        return acc[attr];
      }, root);
      return realValue.call(caller, argumentsList);
    },
    set(_target, propertyName, value, _receiver) {
      const real = paths.reduce((acc: any, attr) => acc[attr], root);
      real[propertyName] = value;
      return true;
    },
    get(_target, propertyName) {
      switch (propertyName) {
        case "_":
          return paths;
        case "body": {
          return element(globalThis, ["document", "body"]);
        }
        case "querySelector": {
          return element();
        }
        case "textContent": {
          return accessSync({
            op: "access",
            paths: [...paths, "textContent"],
          } as RemoteCommand);
        }
      }
      return element([...paths, propertyName as string]);
    },
  });
}

export const stubWorkerDocument = () => {
  // @ts-ignore
  globalThis.document = element();
  // @ts-ignore
  globalThis.window = element();
};

export const accessSync = (cmd: any) => {
  const encoded = btoa(JSON.stringify(cmd));
  const url = "/__town?" + encoded;
  let result: any;
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.onload = (_e) =>
    xhr.readyState === 4 && xhr.status === 200 && (result = xhr.responseText);
  xhr.onerror = console.error;
  xhr.send(null);
  return result;
};

// === sw
let cnt = 0;
const _callbacks = new Map<number, (value: any) => void>();

export function handleMessageOnServiceWorker(ev: MessageEvent) {
  const payload = ev.data as ResponsePayload;
  const fn = _callbacks.get(payload.id);
  fn?.(payload.value);
  _callbacks.delete(ev.data.id);
}

export async function handleFetchOnServiceWorker(event: any) {
  const url = new URL(event.request.url);
  const encodedCmd = url.search.substr(1);
  const cmd = JSON.parse(atob(encodedCmd)) as RemoteCommand;
  const id = cnt++;
  let resolve: any;
  const promise = new Promise<any>((r) => (resolve = r));
  _callbacks.set(id, resolve);
  // @ts-ignore
  const client = await clients.get(event.clientId);
  client.postMessage({
    type: "req",
    cmd,
    id,
  } as RequestPayload);

  const value = await promise;
  return new Response(JSON.stringify(value));
}
