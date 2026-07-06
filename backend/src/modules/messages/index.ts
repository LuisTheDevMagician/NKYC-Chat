import { Elysia } from "elysia";
import { db } from "../../db/client";
import { createMessagesRepository } from "../../db/messages.repository";
import { authGuard } from "../auth/guard";
import { conversationParams } from "./model";
import { MessagesService } from "./service";

const messagesRepository = createMessagesRepository(db);

export const messagesModule = new Elysia({ prefix: "/messages" })
  .use(authGuard)
  .get(
    "/:withUserId",
    ({ params, user }) =>
      MessagesService.getConversation(messagesRepository, user.id, params.withUserId),
    { params: conversationParams, isAuthenticated: true }
  );
