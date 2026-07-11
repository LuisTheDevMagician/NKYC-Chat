import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { requestLogger } from "./request-logger";
import { authModule } from "./modules/auth";
import { messagesModule } from "./modules/messages";
import { chatModule } from "./modules/chat";

// Em dev o frontend pode ser acessado por outros dispositivos na mesma rede
// (ex.: um celular no Wi‑Fi acessando o IP de rede da máquina de dev). Liberamos localhost
// mais as origens de rede local privada para que essas requisições com credenciais não sejam
// bloqueadas pelo CORS. `credentials: true` proíbe o curinga `*`, então validamos a origem por requisição.
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
        // Sem cabeçalho Origin (mesma origem / clientes que não são navegador) → libera.
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
