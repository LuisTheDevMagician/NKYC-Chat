import { join } from "node:path";
import { existsSync } from "node:fs";

const root = import.meta.dir;

// ── Terminal styling ────────────────────────────────────────────────────────
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

interface AppSpec {
  name: string;
  dir: string;
  color: string; // ANSI foreground color for this app's tag
  /** Env keys to strip before spawning (e.g. drop PORT so `next dev` picks 3000). */
  omitEnvKeys?: string[];
}

// Width of the widest tag ("[FRONTEND]") so every prefixed line lines up.
const TAG_WIDTH = "[FRONTEND]".length;

function tag(name: string, color: string): string {
  const label = `[${name}]`.padEnd(TAG_WIDTH);
  return `${BOLD}${color}${label}${RESET}`;
}

/** Print a message from the launcher itself under an app's tag. */
function log(app: AppSpec, message: string): void {
  process.stdout.write(`${tag(app.name, app.color)} ${DIM}${message}${RESET}\n`);
}

// ── Dependency bootstrap ─────────────────────────────────────────────────────
/** Ensure `bun install` has run in `app.dir`; run it if node_modules is missing. */
async function ensureDeps(app: AppSpec): Promise<void> {
  if (existsSync(join(app.dir, "node_modules"))) return;

  log(app, "node_modules ausente — instalando dependências com `bun install`...");
  const install = Bun.spawn(["bun", "install"], {
    cwd: app.dir,
    stdio: ["inherit", "inherit", "inherit"],
  });
  const code = await install.exited;
  if (code !== 0) {
    log(app, `falha ao instalar dependências (código ${code}) — abortando.`);
    process.exit(1);
  }
  log(app, "dependências instaladas.");
}

// ── Output piping with colored, per-app tags ─────────────────────────────────
/**
 * Read a child stream line by line and re-emit each line prefixed with the
 * app's colored tag, so backend and frontend output is visually distinct and
 * clearly attributed in a single terminal.
 */
async function pipeWithTag(
  stream: ReadableStream<Uint8Array>,
  app: AppSpec,
  sink: NodeJS.WriteStream
): Promise<void> {
  const decoder = new TextDecoder();
  const prefix = tag(app.name, app.color);
  let buffer = "";

  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      sink.write(`${prefix} ${line}\n`);
      buffer = buffer.slice(newlineIndex + 1);
    }
  }
  if (buffer.length > 0) sink.write(`${prefix} ${buffer}\n`);
}

function start(app: AppSpec) {
  const env = { ...process.env };
  for (const key of app.omitEnvKeys ?? []) delete env[key];

  // detached: true (setsid) makes the child its own process-group leader, so we
  // can kill it and everything `bun --watch` / `next dev` spawns under it via -pid.
  const proc = Bun.spawn(["bun", "run", "dev"], {
    cwd: app.dir,
    stdio: ["inherit", "pipe", "pipe"],
    detached: true,
    env,
  });

  void pipeWithTag(proc.stdout, app, process.stdout);
  void pipeWithTag(proc.stderr, app, process.stderr);
  return proc;
}

// ── Boot sequence ────────────────────────────────────────────────────────────
const backend: AppSpec = { name: "BACKEND", dir: join(root, "backend"), color: "\x1b[36m" }; // cyan
const frontend: AppSpec = {
  name: "FRONTEND",
  dir: join(root, "frontend"),
  color: "\x1b[35m", // magenta
  // The root .env sets PORT=3001 for the backend; Bun auto-loads it into this
  // process's env. Strip it so `next dev` falls back to 3000 instead of colliding.
  omitEnvKeys: ["PORT"],
};

// Install missing deps first (sequentially, to keep the output readable).
await ensureDeps(backend);
await ensureDeps(frontend);

const procs = [start(backend), start(frontend)];

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const proc of procs) {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {}
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.race(procs.map((p) => p.exited));
shutdown();
