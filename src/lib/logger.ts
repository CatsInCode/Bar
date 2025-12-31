type LogStatus = "start" | "success" | "error" | "info";

type DbLogEntry = {
  scope: "db";
  action: string;
  status: LogStatus;
  mode?: "firebase" | "local";
  path?: string;
  details?: Record<string, unknown>;
};

const LOG_STORAGE_KEY = "barmen-db-log-buffer-v1";
const LOG_ENDPOINT = "/__log";
const MAX_BUFFER = 5;

function updateLocalBuffer(entry: DbLogEntry) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(LOG_STORAGE_KEY);
  let existing: DbLogEntry[] = [];
  if (raw) {
    try {
      existing = JSON.parse(raw) as DbLogEntry[];
    } catch {
      existing = [];
    }
  }
  const next = [...existing, entry].slice(-MAX_BUFFER);
  window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(next));
}

function sendToServer(entry: DbLogEntry) {
  if (typeof fetch !== "function") return;
  fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
    keepalive: true,
  }).catch(() => undefined);
}

export function logDbEvent(entry: DbLogEntry) {
  const payload = { ...entry, ts: new Date().toISOString() };
  if (entry.status === "error") {
    console.error("[DB]", payload);
  } else {
    console.log("[DB]", payload);
  }
  updateLocalBuffer(entry);
  sendToServer(entry);
}
