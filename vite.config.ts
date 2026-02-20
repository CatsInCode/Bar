import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const logDir = path.resolve(rootDir, "logs");
const logFile = path.join(logDir, "latest.log");
const maxLogFiles = 5;

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function rotateLogs() {
  ensureLogDir();
  for (let index = maxLogFiles - 1; index >= 1; index -= 1) {
    const src = path.join(logDir, index === 1 ? "latest.log" : `latest-${index - 1}.log`);
    const dest = path.join(logDir, `latest-${index}.log`);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest);
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "db-log-writer",
      configureServer(server) {
        rotateLogs();
        server.middlewares.use("/__log", (req, res, next) => {
          if (req.method !== "POST") {
            next();
            return;
          }
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            ensureLogDir();
            let payload: Record<string, unknown> = {};
            try {
              payload = body ? (JSON.parse(body) as Record<string, unknown>) : {};
            } catch {
              payload = { parseError: true, raw: body };
            }
            const entry = { ts: new Date().toISOString(), ...payload };
            fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
            res.statusCode = 204;
            res.end();
          });
        });
      },
    },
  ],
  server: { port: 5173 },
});
