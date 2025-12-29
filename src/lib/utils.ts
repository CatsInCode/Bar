import { clsx } from "clsx";

export function cn(...args: any[]) {
  return clsx(args);
}

export function nowTs() {
  return Date.now();
}

export function safeNumber(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

/** Удобное округление до 2 знаков, без .00. */
export function prettyNum(n: number) {
  const v = Math.round(n * 100) / 100;
  return String(v).replace(".", ",");
}
