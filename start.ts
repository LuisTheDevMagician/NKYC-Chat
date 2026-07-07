import { join } from "node:path";

const root = import.meta.dir;

function run(cwd: string, omitEnvKeys: string[] = []) {
  const env = { ...process.env };
  for (const key of omitEnvKeys) delete env[key];

  // detached: true (setsid) makes this process its own group leader, so we
  // can kill it and everything `bun --watch` spawns under it via -pid.
  return Bun.spawn(["bun", "run", "dev"], {
    cwd,
    stdio: ["inherit", "inherit", "inherit"],
    detached: true,
    env,
  });
}

const backend = run(join(root, "backend"));
// Bun auto-loads the root .env (PORT=3001, for the backend) into this
// process's own env; strip it here so `next dev` falls back to port 3000
// instead of colliding with the backend.
const frontend = run(join(root, "frontend"), ["PORT"]);

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const proc of [backend, frontend]) {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {}
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.race([backend.exited, frontend.exited]);
shutdown();
