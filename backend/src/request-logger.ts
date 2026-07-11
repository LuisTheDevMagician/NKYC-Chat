import { Elysia } from "elysia";

// Logger de requisições leve. Facilita ver, direto no terminal (sob a tag `[BACKEND]`
// do start.ts), se as requisições realmente chegam ao backend — por exemplo, uma
// tentativa de login/cadastro de um celular na mesma rede Wi‑Fi — e como cada uma é
// resolvida. `.as("global")` promove esses hooks para que eles também disparem nas
// rotas registradas dentro dos módulos de feature montados via `.use()`, e não apenas
// na tabela de rotas (vazia) deste próprio plugin.
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
