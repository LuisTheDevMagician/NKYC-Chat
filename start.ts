import { join } from "node:path";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";

const root = import.meta.dir;

// ── Estilização do terminal ─────────────────────────────────────────────────
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// IP IPv4 desta máquina na rede local (ex.: 192.168.x.x). Usado para substituir o
// "0.0.0.0" que o `next dev -H 0.0.0.0` imprime na linha "Network" por um endereço que
// realmente dá para digitar em outro dispositivo. `null` se a máquina não está em rede.
const LAN_IP: string | null =
  Object.values(networkInterfaces())
    .flat()
    .find((iface) => iface && iface.family === "IPv4" && !iface.internal)?.address ?? null;

/**
 * Troca o host coringa "0.0.0.0" pelo IP de rede real nas URLs impressas (ex.: a linha "Network"
 * do Next), para que o endereço mostrado seja de fato acessável de outro dispositivo. Casa apenas
 * "//0.0.0.0" (dentro de http:// / ws://), preservando o "-H 0.0.0.0" do comando ecoado.
 */
function showRealHost(text: string): string {
  return LAN_IP ? text.replaceAll("//0.0.0.0", `//${LAN_IP}`) : text;
}

interface AppSpec {
  name: string;
  dir: string;
  color: string; // cor de frente (ANSI) para a tag deste app
  /** Chaves de env a remover antes de subir o processo (ex.: tirar PORT para o `next dev` usar a 3000). */
  omitEnvKeys?: string[];
}

// Largura da maior tag ("[FRONTEND]") para que toda linha prefixada fique alinhada.
const TAG_WIDTH = "[FRONTEND]".length;

function tag(name: string, color: string): string {
  const label = `[${name}]`.padEnd(TAG_WIDTH);
  return `${BOLD}${color}${label}${RESET}`;
}

/** Imprime uma mensagem do próprio orquestrador sob a tag de um app. */
function log(app: AppSpec, message: string): void {
  process.stdout.write(`${tag(app.name, app.color)} ${DIM}${message}${RESET}\n`);
}

// ── Bootstrap de dependências ────────────────────────────────────────────────
/** Garante que `bun install` rodou em `app.dir`; roda se o node_modules estiver ausente. */
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

// ── Encaminhamento da saída com tags coloridas por app ───────────────────────
/**
 * Lê um stream do processo filho linha a linha e reemite cada linha prefixada com a
 * tag colorida do app, para que a saída do backend e do frontend seja visualmente
 * distinta e claramente atribuída em um único terminal.
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
      sink.write(`${prefix} ${showRealHost(line)}\n`);
      buffer = buffer.slice(newlineIndex + 1);
    }
  }
  if (buffer.length > 0) sink.write(`${prefix} ${showRealHost(buffer)}\n`);
}

function start(app: AppSpec) {
  const env = { ...process.env };
  for (const key of app.omitEnvKeys ?? []) delete env[key];

  // detached: true (setsid) torna o filho líder do próprio grupo de processos, para que
  // possamos encerrá-lo — e tudo que `bun --watch` / `next dev` cria sob ele — via -pid.
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

// ── Sequência de inicialização ───────────────────────────────────────────────
const backend: AppSpec = { name: "BACKEND", dir: join(root, "backend"), color: "\x1b[36m" }; // ciano
const frontend: AppSpec = {
  name: "FRONTEND",
  dir: join(root, "frontend"),
  color: "\x1b[35m", // magenta
  // O .env da raiz define PORT=3001 para o backend; o Bun carrega isso automaticamente no
  // env deste processo. Removemos essa chave para o `next dev` cair na 3000 em vez de colidir.
  omitEnvKeys: ["PORT"],
};

// Instala as dependências ausentes primeiro (sequencialmente, para manter a saída legível).
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
