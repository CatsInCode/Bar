import { nanoid } from "nanoid";
import recipesSeed from "../../recipes.json";
import catalogSeed from "../../sample_data/sampleCatalog.json";
import { CatalogItem, Event, IngredientUnit, Order, Recipe } from "../types";
import { nowTs } from "./utils";

type Collection<T> = Record<string, Omit<T, "id">>;

type LocalDbData = {
  recipes: Collection<Recipe>;
  catalog: Collection<CatalogItem>;
  events: Collection<Event>;
  orders: Collection<Order>;
};

const STORAGE_KEY = "barmen-local-db-v1";
const listeners = new Map<string, Set<() => void>>();
let cache: LocalDbData | null = null;

const VALID_UNITS: IngredientUnit[] = ["l", "kg", "pcs", "ml", "g", "unit"];

function normalizePath(path: string) {
  return `/${path.split("/").filter(Boolean).join("/")}`;
}

function getCollectionKey(path: string): keyof LocalDbData {
  const [root] = normalizePath(path).split("/").filter(Boolean);
  if (!root) throw new Error(`Invalid path: ${path}`);
  return root as keyof LocalDbData;
}

function getRecordId(path: string) {
  const [, id] = normalizePath(path).split("/").filter(Boolean);
  return id ?? "";
}

function toUnit(unit: unknown): IngredientUnit {
  return VALID_UNITS.includes(unit as IngredientUnit) ? (unit as IngredientUnit) : "unit";
}

function seedRecipes(): Collection<Recipe> {
  const ts = nowTs();
  const entries = recipesSeed.recipes.map((r) => {
    const id = nanoid();
    const ingredients = (r.ingredients ?? []).map((i) => ({
      id: nanoid(),
      name: i.name ?? "",
      qty: Number(i.qty) || 0,
      unit: toUnit(i.unit),
      optional: Boolean(i.optional),
    }));
    const item: Omit<Recipe, "id"> = {
      name: r.name ?? "",
      glass: r.glass ?? "",
      method: r.method ?? "",
      notes: "",
      tags: [],
      ingredients,
      createdAt: ts,
      updatedAt: ts,
    };
    return [id, item] as const;
  });
  return Object.fromEntries(entries);
}

function seedCatalog(): Collection<CatalogItem> {
  const entries = catalogSeed.map((item) => {
    const id = nanoid();
    const catalogItem: Omit<CatalogItem, "id"> = {
      match: item.match ?? "",
      title: item.title ?? "",
      section: item.section ?? "other",
      purchaseUnitLabel: item.purchaseUnitLabel ?? "",
      packSize: item.packSize ?? 0,
      packUnit: item.packUnit ? toUnit(item.packUnit) : "unit",
      brandsNote: item.brandsNote ?? "",
      url: item.url ?? "",
      createdAt: item.createdAt ?? nowTs(),
      updatedAt: item.updatedAt ?? nowTs(),
    };
    return [id, catalogItem] as const;
  });
  return Object.fromEntries(entries);
}

function ensureDataShape(data: Partial<LocalDbData>): LocalDbData {
  return {
    recipes: data.recipes ?? seedRecipes(),
    catalog: data.catalog ?? seedCatalog(),
    events: data.events ?? {},
    orders: data.orders ?? {},
  };
}

function loadData(): LocalDbData {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = ensureDataShape({});
    return cache;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    cache = ensureDataShape({});
    persist();
    return cache;
  }
  try {
    cache = ensureDataShape(JSON.parse(raw));
  } catch {
    cache = ensureDataShape({});
    persist();
  }
  return cache;
}

function persist() {
  if (!cache || typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

function subscribe(path: string, handler: () => void) {
  const key = normalizePath(path);
  const set = listeners.get(key) ?? new Set();
  set.add(handler);
  listeners.set(key, set);
  handler();
  return () => {
    const next = listeners.get(key);
    if (!next) return;
    next.delete(handler);
    if (!next.size) listeners.delete(key);
  };
}

function emit(path: string) {
  const key = normalizePath(path);
  listeners.get(key)?.forEach((handler) => handler());
}

function emitFor(path: string) {
  const normalized = normalizePath(path);
  emit(normalized);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length > 1) {
    emit(`/${parts[0]}`);
  }
}

export type Unsubscribe = () => void;

export function listenObject<T>(path: string, cb: (val: T | null) => void): Unsubscribe {
  return subscribe(path, () => {
    const data = loadData();
    const collection = data[getCollectionKey(path)] as Record<string, T>;
    const id = getRecordId(path);
    cb(id ? collection?.[id] ?? null : (collection as unknown as T));
  });
}

export function listenList<T>(path: string, cb: (items: T[]) => void): Unsubscribe {
  return subscribe(path, () => {
    const data = loadData();
    const collection = data[getCollectionKey(path)] as Record<string, T>;
    const items = Object.entries(collection ?? {}).map(([id, item]) => ({ ...(item as any), id }));
    cb(items);
  });
}

export async function createAt<T extends object>(path: string, data: T) {
  const store = loadData();
  const key = getCollectionKey(path);
  const id = nanoid();
  store[key][id] = data as any;
  persist();
  emitFor(`${path}/${id}`);
  return id;
}

export async function setAt<T>(path: string, data: T) {
  const store = loadData();
  const key = getCollectionKey(path);
  const id = getRecordId(path);
  if (!id) {
    store[key] = data as any;
  } else {
    store[key][id] = data as any;
  }
  persist();
  emitFor(path);
}

export async function updateAt(path: string, patch: object) {
  const store = loadData();
  const key = getCollectionKey(path);
  const id = getRecordId(path);
  if (!id) return;
  const current = store[key][id] ?? {};
  store[key][id] = { ...(current as any), ...(patch as any) };
  persist();
  emitFor(path);
}

export async function removeAt(path: string) {
  const store = loadData();
  const key = getCollectionKey(path);
  const id = getRecordId(path);
  if (!id) return;
  delete store[key][id];
  persist();
  emitFor(path);
}
