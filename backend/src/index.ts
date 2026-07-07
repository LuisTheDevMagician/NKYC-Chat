import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { requestLogger } from "./request-logger";
import { authModule } from "./modules/auth";
import { messagesModule } from "./modules/messages";
import { chatModule } from "./modules/chat";

// In dev the frontend may be reached from other devices on the same network
// (e.g. a phone over Wi‑Fi hitting the dev machine's LAN IP). Allow localhost
// plus private-LAN origins so those credentialed requests aren't blocked by CORS.
// `credentials: true` forbids the `*` wildcard, so we validate the origin per request.
function isAllowedOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    return (
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

const app = new Elysia()
  .use(
    cors({
      origin: (request) => {
        const origin = request.headers.get("origin");
        // No Origin header (same-origin / non-browser clients) → allow.
        return origin === null || isAllowedOrigin(origin);
      },
      credentials: true,
    })
  )
  .use(requestLogger)
  .use(authModule)
  .use(messagesModule)
  .use(chatModule)
  .listen(config.port);

console.log(`🦊 NKYC Chat backend running at ${app.server?.hostname}:${app.server?.port}`);
