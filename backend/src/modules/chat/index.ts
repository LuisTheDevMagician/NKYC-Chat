import { Elysia } from "elysia";
import { db } from "../../db/client";
import { createMessagesRepository } from "../../db/messages.repository";
import { createConversationsRepository } from "../../db/conversations.repository";
import { authGuard } from "../auth/guard";
import { clientEvent, type ServerEvent } from "./model";
import { createConnectionRegistry } from "./connection-registry";
import { broadcastPresence, broadcastTyping, broadcastGroupEnded } from "./presence-broadcaster";
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

      if (event.type === "typing") {
        broadcastTyping(registry, conversationsRepository, user.id, {
          to: event.to,
          conversationId: event.conversationId,
        });
        return;
      }

      if (event.type === "create-group") {
        const conversation = conversationsRepository.createGroup(user.id, event.participantIds, event.name ?? null);
        const participants = conversationsRepository.findParticipants(conversation.id);
        const name = conversation.name ?? participants.map((p) => p.username).join(", ");
        const invite: ServerEvent = {
          type: "group-invite",
          conversationId: conversation.id,
          name,
          createdBy: { id: user.id, username: user.username, publicKey: "" },
          participantUsernames: participants.map((p) => p.username),
        };
        for (const participant of participants) {
          if (participant.userId === user.id) continue;
          registry.get(participant.userId)?.send(invite);
        }
        return;
      }

      // respond-group-invite
      conversationsRepository.respondToInvite(event.conversationId, user.id, event.response);

      // When someone accepts, the other participants' cached member lists are now
      // stale (they don't know about the newcomer), so they'd address group messages
      // to the wrong recipient set. Tell every accepted participant to refresh.
      if (event.response === "accepted") {
        const joined: ServerEvent = { type: "group-joined", conversationId: event.conversationId };
        for (const participantId of conversationsRepository.findAcceptedParticipantIds(event.conversationId)) {
          registry.get(participantId)?.send(joined);
        }
      }
    },
    close(ws) {
      const { user } = ws.data;
      const activeGroups = conversationsRepository.findActiveGroupsForUser(user.id);
      const groupParticipantIds = activeGroups.map((group) => ({
        id: group.id,
        participantIds: conversationsRepository.findAcceptedParticipantIds(group.id),
      }));

      registry.remove(user.id);
      conversationsRepository.endAllActiveForUser(user.id);
      conversationsRepository.declineAllPendingForUser(user.id);

      for (const group of groupParticipantIds) {
        broadcastGroupEnded(registry, group.participantIds, group.id);
      }
      broadcastPresence(registry);
    },
  });
