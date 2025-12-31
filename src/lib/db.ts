import { onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "../firebase";
import { logDbEvent } from "./logger";
import {
  createAt as localCreateAt,
  listenList as localListenList,
  listenObject as localListenObject,
  removeAt as localRemoveAt,
  setAt as localSetAt,
  updateAt as localUpdateAt,
} from "./localDb";

export type Unsubscribe = () => void;

function shouldUseFirebase() {
  return import.meta.env.VITE_USE_FIREBASE !== "false";
}

let connectionLoggingReady = false;

function initConnectionLogging() {
  if (connectionLoggingReady || !shouldUseFirebase()) return;
  connectionLoggingReady = true;
  const connectionRef = ref(db, ".info/connected");
  onValue(connectionRef, (snap) => {
    const connected = Boolean(snap.val());
    logDbEvent({
      scope: "db",
      action: "connection",
      status: connected ? "success" : "info",
      mode: "firebase",
      details: { connected },
    });
  });
}

initConnectionLogging();

export function listenObject<T>(path: string, cb: (val: T | null) => void): Unsubscribe {
  const mode = shouldUseFirebase() ? "firebase" : "local";
  logDbEvent({ scope: "db", action: "listenObject", status: "start", mode, path });
  if (mode === "local") {
    let first = true;
    return localListenObject(path, (val) => {
      if (first) {
        logDbEvent({
          scope: "db",
          action: "listenObject",
          status: "success",
          mode,
          path,
          details: { hasValue: val !== null },
        });
        first = false;
      }
      cb(val);
    });
  }
  const r = ref(db, path);
  let first = true;
  const unsub = onValue(r, (snap) => {
    const value = snap.exists() ? (snap.val() as T) : null;
    if (first) {
      logDbEvent({
        scope: "db",
        action: "listenObject",
        status: "success",
        mode,
        path,
        details: { hasValue: value !== null },
      });
      first = false;
    }
    cb(value);
  });
  return () => unsub();
}

export function listenList<T>(path: string, cb: (items: T[]) => void): Unsubscribe {
  const mode = shouldUseFirebase() ? "firebase" : "local";
  logDbEvent({ scope: "db", action: "listenList", status: "start", mode, path });
  if (mode === "local") {
    let first = true;
    return localListenList(path, (items) => {
      if (first) {
        logDbEvent({
          scope: "db",
          action: "listenList",
          status: "success",
          mode,
          path,
          details: { count: items.length },
        });
        first = false;
      }
      cb(items);
    });
  }
  const r = ref(db, path);
  let first = true;
  const unsub = onValue(r, (snap) => {
    const val = snap.exists() ? (snap.val() as Record<string, T>) : {};
    const items = Object.entries(val).map(([id, data]) => ({ ...(data as any), id }));
    if (first) {
      logDbEvent({
        scope: "db",
        action: "listenList",
        status: "success",
        mode,
        path,
        details: { count: items.length },
      });
      first = false;
    }
    cb(items);
  });
  return () => unsub();
}

export async function createAt<T extends object>(path: string, data: T) {
  const mode = shouldUseFirebase() ? "firebase" : "local";
  logDbEvent({ scope: "db", action: "createAt", status: "start", mode, path });
  if (mode === "local") {
    try {
      const id = await localCreateAt(path, data);
      logDbEvent({
        scope: "db",
        action: "createAt",
        status: "success",
        mode,
        path,
        details: { id },
      });
      return id;
    } catch (error) {
      logDbEvent({
        scope: "db",
        action: "createAt",
        status: "error",
        mode,
        path,
        details: { error: (error as Error).message },
      });
      throw error;
    }
  }
  try {
    const r = ref(db, path);
    const newRef = push(r);
    await set(newRef, data);
    logDbEvent({
      scope: "db",
      action: "createAt",
      status: "success",
      mode,
      path,
      details: { id: newRef.key },
    });
    return newRef.key!;
  } catch (error) {
    logDbEvent({
      scope: "db",
      action: "createAt",
      status: "error",
      mode,
      path,
      details: { error: (error as Error).message },
    });
    throw error;
  }
}

export async function setAt<T>(path: string, data: T) {
  const mode = shouldUseFirebase() ? "firebase" : "local";
  logDbEvent({ scope: "db", action: "setAt", status: "start", mode, path });
  if (mode === "local") {
    try {
      await localSetAt(path, data);
      logDbEvent({ scope: "db", action: "setAt", status: "success", mode, path });
      return;
    } catch (error) {
      logDbEvent({
        scope: "db",
        action: "setAt",
        status: "error",
        mode,
        path,
        details: { error: (error as Error).message },
      });
      throw error;
    }
  }
  try {
    const r = ref(db, path);
    await set(r, data);
    logDbEvent({ scope: "db", action: "setAt", status: "success", mode, path });
  } catch (error) {
    logDbEvent({
      scope: "db",
      action: "setAt",
      status: "error",
      mode,
      path,
      details: { error: (error as Error).message },
    });
    throw error;
  }
}

export async function updateAt(path: string, patch: object) {
  const mode = shouldUseFirebase() ? "firebase" : "local";
  logDbEvent({ scope: "db", action: "updateAt", status: "start", mode, path });
  if (mode === "local") {
    try {
      await localUpdateAt(path, patch);
      logDbEvent({ scope: "db", action: "updateAt", status: "success", mode, path });
      return;
    } catch (error) {
      logDbEvent({
        scope: "db",
        action: "updateAt",
        status: "error",
        mode,
        path,
        details: { error: (error as Error).message },
      });
      throw error;
    }
  }
  try {
    const r = ref(db, path);
    await update(r, patch);
    logDbEvent({ scope: "db", action: "updateAt", status: "success", mode, path });
  } catch (error) {
    logDbEvent({
      scope: "db",
      action: "updateAt",
      status: "error",
      mode,
      path,
      details: { error: (error as Error).message },
    });
    throw error;
  }
}

export async function removeAt(path: string) {
  const mode = shouldUseFirebase() ? "firebase" : "local";
  logDbEvent({ scope: "db", action: "removeAt", status: "start", mode, path });
  if (mode === "local") {
    try {
      await localRemoveAt(path);
      logDbEvent({ scope: "db", action: "removeAt", status: "success", mode, path });
      return;
    } catch (error) {
      logDbEvent({
        scope: "db",
        action: "removeAt",
        status: "error",
        mode,
        path,
        details: { error: (error as Error).message },
      });
      throw error;
    }
  }
  try {
    const r = ref(db, path);
    await remove(r);
    logDbEvent({ scope: "db", action: "removeAt", status: "success", mode, path });
  } catch (error) {
    logDbEvent({
      scope: "db",
      action: "removeAt",
      status: "error",
      mode,
      path,
      details: { error: (error as Error).message },
    });
    throw error;
  }
}
