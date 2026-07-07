import type { ConnectionRegistry } from "./connection-registry";
import type { ConversationsRepository } from "../../db/conversations.repository";
import type { ServerEvent } from "./model";

export function broadcastPresence(registry: ConnectionRegistry): void {
  const connections = registry.list();
  for (const connection of connections) {
    const users = connections
      .filter((c) => c.userId !== connection.userId)
      .map((c) => ({ id: c.userId, username: c.username, publicKey: c.publicKey }));
    const event: ServerEvent = { type: "presence", users };
    connection.send(event);
  }
}

export function broadcastTyping(
  registry: ConnectionRegistry,
  conversationsRepository: ConversationsRepository,
  from: number,
  target: { to?: number; conversationId?: number }
): void {
  if (target.conversationId !== undefined) {
    const conversationId = target.conversationId;
    const participantIds = conversationsRepository.findAcceptedParticipantIds(conversationId);
    const event: ServerEvent = { type: "typing", from, conversationId };
    for (const userId of participantIds) {
      if (userId === from) continue;
      registry.get(userId)?.send(event);
    }
    return;
  }

  if (target.to !== undefined) {
    const event: ServerEvent = { type: "typing", from };
    registry.get(target.to)?.send(event);
  }
}

export function broadcastGroupEnded(registry: ConnectionRegistry, participantIds: number[], conversationId: number): void {
  const event: ServerEvent = { type: "group-ended", conversationId };
  for (const userId of participantIds) {
    registry.get(userId)?.send(event);
  }
}
