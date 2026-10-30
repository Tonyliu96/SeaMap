import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

const python = ".venv/bin/python";
const environmentFiles = [".env.local", ".env.development.local", ".env"];

if (!existsSync(python)) {
  console.error("Missing .venv. Create it and install requirements.txt before starting the app.");
  process.exit(1);
}

for (const file of environmentFiles) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
if (!redisUrl || !redisToken || redisUrl.includes("[SENSITIVE]") || redisToken.includes("[SENSITIVE]")) {
  console.warn("Upstash Redis credentials are missing or redacted; marine history persistence is disabled locally.");
}

const children = [
  spawn(python, ["-m", "uvicorn", "api.index:app", "--host", "127.0.0.1", "--port", "8000"], {
    stdio: "inherit"
  }),
  spawn("node_modules/.bin/vite", ["--host", "0.0.0.0"], {
    stdio: "inherit"
  })
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 100).unref();
}

for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) stop(signal ? 1 : (code ?? 0));
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
