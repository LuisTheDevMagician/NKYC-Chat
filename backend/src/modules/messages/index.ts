import { Elysia } from "elysia";
import { db } from "../../db/client";
import { createMessagesRepository } from "../../db/messages.repository";
import { createConversationsRepository } from "../../db/conversations.repository";
import { authGuard } from "../auth/guard";
import { activeConversationParams, historyDetailParams } from "./model";
import { MessagesService } from "./service";

const messagesRepository = createMessagesRepository(db);
const conversationsRepository = createConversationsRepository(db);

export const messagesModule = new Elysia({ prefix: "/messages" })
  .use(authGuard)
  .get(
    "/active/:withUserId",
    ({ params, user }) =>
      MessagesService.getActiveConversation(messagesRepository, conversationsRepository, user.id, params.withUserId),
    { params: activeConversationParams, isAuthenticated: true }
  )
  .get(
    "/groups",
    ({ user }) => MessagesService.getActiveGroups(conversationsRepository, user.id),
    { isAuthenticated: true }
  )
  .get(
    "/group/:conversationId",
    ({ params, user, status }) => {
      const result = MessagesService.getGroupMessages(
        messagesRepository,
        conversationsRepository,
        user.id,
        params.conversationId
      );
      if (result === null) return status(404, { error: "conversation_not_found" });
      return result;
    },
    { params: historyDetailParams, isAuthenticated: true }
  )
  .get(
    "/history",
    ({ user }) => MessagesService.getHistory(conversationsRepository, user.id),
    { isAuthenticated: true }
  )
  .get(
    "/history/:conversationId",
    ({ params, user, status }) => {
      const result = MessagesService.getConversationMessages(
        messagesRepository,
        conversationsRepository,
        user.id,
        params.conversationId
      );
      if (result === null) return status(404, { error: "conversation_not_found" });
      return result;
    },
    { params: historyDetailParams, isAuthenticated: true }
  );
