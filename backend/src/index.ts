import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { authModule } from "./modules/auth";
import { messagesModule } from "./modules/messages";
import { chatModule } from "./modules/chat";

const app = new Elysia()
  .use(
    cors({
      origin: "http://localhost:3001",
      credentials: true,
    })
  )
  .use(authModule)
  .use(messagesModule)
  .use(chatModule)
  .listen(config.port);

console.log(`🦊 NKYC Chat backend running at ${app.server?.hostname}:${app.server?.port}`);
