import { Elysia } from "elysia";
import { db } from "../../db/client";
import { createMessagesRepository } from "../../db/messages.repository";
import { createConversationsRepository } from "../../db/conversations.repository";
import { authGuard } from "../auth/guard";
import { clientEvent } from "./model";
import { createConnectionRegistry } from "./connection-registry";
import { broadcastPresence, broadcastTyping } from "./presence-broadcaster";
import { routeMessage } from "./message-router";

const messagesRepository = createMessagesRepository(db);
const conversationsRepository = createConversationsRepository(db);
const registry = createConnectionRegistry();

export const chatModule = new Elysia()
  .use(authGuard)
  .ws("/ws", {
    body: clientEvent,
    isAuthenticated: true,
    message(ws, event) {
      const { user } = ws.data;

      if (event.type === "hello") {
        registry.add({
          userId: user.id,
          username: user.username,
          publicKey: event.publicKey,
          send: (payload) => ws.send(JSON.stringify(payload)),
        });
        broadcastPresence(registry);
        return;
      }

      if (event.type === "message") {
        routeMessage(registry, messagesRepository, conversationsRepository, user.id, event);
        return;
      }

      broadcastTyping(registry, user.id, event.to);
    },
    close(ws) {
      registry.remove(ws.data.user.id);
      conversationsRepository.endAllActiveForUser(ws.data.user.id);
      broadcastPresence(registry);
    },
  });
