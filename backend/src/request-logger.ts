import { Elysia } from "elysia";

// Lightweight request logger. Makes it easy to see, right in the terminal
// (under the `[BACKEND]` tag from start.ts), whether requests actually reach the
// backend — e.g. a login/register attempt from a phone on the same Wi‑Fi — and
// how each one resolves. `.as("global")` promotes these hooks so they also fire
// for routes registered inside the feature modules mounted via `.use()`, not
// just this plugin's own (empty) route table.
export const requestLogger = new Elysia({ name: "request-logger" })
  .onRequest(({ request, server }) => {
    const path = new URL(request.url).pathname;
    const origin = request.headers.get("origin") ?? "-";
    const ip = server?.requestIP(request)?.address ?? "?";
    console.log(`→ ${request.method} ${path}  (origin=${origin} ip=${ip})`);
  })
  .onAfterResponse(({ request, set }) => {
    const path = new URL(request.url).pathname;
    console.log(`← ${request.method} ${path}  (status=${set.status ?? "?"})`);
  })
  .onError(({ request, code, error }) => {
    const path = new URL(request.url).pathname;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${request.method} ${path}  (code=${code}) ${message}`);
  })
  .as("global");
