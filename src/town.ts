type Ptr = string | number;

export type RemoteCommand =
  | {
      op: "set";
      ptr: Ptr;
      key: string | number;
      value: ValueOrPtr;
    }
  | {
      op: "access";
      ptr: Ptr;
      key: string | number;
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

type ValueOrPtr =
  | {
      isPtr: true;
      ptr: Ptr;
      parentPtr?: Ptr;
    }
  | {
      isPtr: false;
      value: any;
    };

// === main thread
const instanceMap = new Map<Ptr, any>();
if (globalThis.document) {
  instanceMap.set("document", document);
  instanceMap.set("window", window);
}

export function resolveCommandOnMain(command: RemoteCommand): ValueOrPtr {
  switch (command.op) {
    case "set": {
      const parent = instanceMap.get(command.ptr);
      const rightValue = command.value.isPtr
        ? instanceMap.get(command.value.ptr)
        : command.value.value;
      parent[command.key] = rightValue;
      return {
        isPtr: false,
        value: undefined,
      };
    }
    case "access": {
      const parent = instanceMap.get(command.ptr);
      const rawValue = parent[command.key];
      if (
        rawValue == null ||
        ["number", "string", "boolean"].includes(typeof rawValue)
      ) {
        return {
          isPtr: false,
          value: rawValue,
        };
      } else {
        const childPtr = Math.random().toString(32).substr(2);
        instanceMap.set(childPtr, rawValue);
        return {
          isPtr: true,
          ptr: childPtr,
          parentPtr: command.ptr,
        };
      }
    }
  }
}

export function handleMessageOnMain(event: MessageEvent) {
  if (event.data.type === "req") {
    const req = event.data as RequestPayload;
    // console.log("[main]", req);
    // console.log("[main-result]", resolveCommandOnMain(req.cmd));
    navigator.serviceWorker.controller!.postMessage({
      type: "res",
      id: req.id,
      value: resolveCommandOnMain(req.cmd),
    } as ResponsePayload);
  }
}

// === worker
export function createPtr(ptr: any): any {
  return new Proxy(() => {}, {
    apply(_target, _thisArg, argumentsList) {
      // let caller = null;
      // const realValue = paths.reduce((acc: any, attr) => {
      //   caller = acc;
      //   return acc[attr];
      // }, globalThis);
      // return realValue.call(caller, argumentsList);
    },
    set(_target, propertyName, value, _receiver) {
      const remoteValue =
        typeof value === "object" && value._ptr
          ? value._ptr
          : {
              isPtr: false,
              value,
            };
      const _ret = execCommandSyncOnWorker({
        op: "set",
        ptr: ptr,
        key: propertyName,
        value: remoteValue,
      } as RemoteCommand);
      return true;
    },
    get(_target, propertyName) {
      if (propertyName == "_ptr") {
        return {
          ptr,
          isPtr: true,
        };
      }
      const ret = execCommandSyncOnWorker({
        op: "access",
        ptr: ptr,
        key: propertyName,
      } as RemoteCommand);
      if (ret.isPtr) {
        return createPtr(ret.ptr);
      } else {
        return ret.value;
      }
    },
  });
}

export const stubDocumentOnWorker = () => {
  globalThis.document = createPtr("document");
  globalThis.window = createPtr("window");
};

export const execCommandSyncOnWorker = (cmd: RemoteCommand): ValueOrPtr => {
  const encoded = btoa(JSON.stringify(cmd));
  const url = "/__town?" + encoded;
  let result: any;
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.onload = (_e) =>
    xhr.readyState === 4 && xhr.status === 200 && (result = xhr.responseText);
  xhr.onerror = console.error;
  xhr.send(null);
  return JSON.parse(result);
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
