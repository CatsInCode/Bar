import { onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "../firebase";
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

export function listenObject<T>(path: string, cb: (val: T | null) => void): Unsubscribe {
  if (!shouldUseFirebase()) {
    return localListenObject(path, cb);
  }
  const r = ref(db, path);
  const unsub = onValue(r, (snap) => {
    cb(snap.exists() ? (snap.val() as T) : null);
  });
  return () => unsub();
}

export function listenList<T>(path: string, cb: (items: T[]) => void): Unsubscribe {
  if (!shouldUseFirebase()) {
    return localListenList(path, cb);
  }
  const r = ref(db, path);
  const unsub = onValue(r, (snap) => {
    const val = snap.exists() ? (snap.val() as Record<string, T>) : {};
    const items = Object.entries(val).map(([id, data]) => ({ ...(data as any), id }));
    cb(items);
  });
  return () => unsub();
}

export async function createAt<T extends object>(path: string, data: T) {
  if (!shouldUseFirebase()) {
    return localCreateAt(path, data);
  }
  const r = ref(db, path);
  const newRef = push(r);
  await set(newRef, data);
  return newRef.key!;
}

export async function setAt<T>(path: string, data: T) {
  if (!shouldUseFirebase()) {
    return localSetAt(path, data);
  }
  const r = ref(db, path);
  await set(r, data);
}

export async function updateAt(path: string, patch: object) {
  if (!shouldUseFirebase()) {
    return localUpdateAt(path, patch);
  }
  const r = ref(db, path);
  await update(r, patch);
}

export async function removeAt(path: string) {
  if (!shouldUseFirebase()) {
    return localRemoveAt(path);
  }
  const r = ref(db, path);
  await remove(r);
}
