import type { ConnectionRegistry } from "./connection-registry";
import type { MessagesRepository } from "../../db/messages.repository";
import type { ConversationsRepository } from "../../db/conversations.repository";
import type { ClientEvent, ServerEvent } from "./model";

export function routeMessage(
  registry: ConnectionRegistry,
  messagesRepository: MessagesRepository,
  conversationsRepository: ConversationsRepository,
  fromUserId: number,
  event: Extract<ClientEvent, { type: "message" }>
): { delivered: boolean } {
  if (event.to === fromUserId) return { delivered: false };

  const conversation = conversationsRepository.getOrCreateActive(fromUserId, event.to);

  const saved = messagesRepository.create({
    conversationId: conversation.id,
    fromUserId,
    toUserId: event.to,
    ciphertext: event.ciphertext,
    encryptedAesKey: event.encryptedAesKey,
    encryptedAesKeyForSender: event.encryptedAesKeyForSender,
    iv: event.iv,
  });

  const recipient = registry.get(event.to);
  if (!recipient) return { delivered: false };

  const outgoing: ServerEvent = {
    type: "message",
    from: fromUserId,
    ciphertext: event.ciphertext,
    iv: event.iv,
    encryptedAesKey: event.encryptedAesKey,
    createdAt: saved.createdAt,
  };
  recipient.send(outgoing);
  return { delivered: true };
}
