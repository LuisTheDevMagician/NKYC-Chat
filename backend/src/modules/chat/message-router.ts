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
  let conversationId: number;

  if (event.conversationId !== undefined) {
    if (!conversationsRepository.isAcceptedParticipant(event.conversationId, fromUserId)) {
      return { delivered: false };
    }
    conversationId = event.conversationId;
  } else if (event.to !== undefined) {
    if (event.to === fromUserId) return { delivered: false };
    conversationId = conversationsRepository.getOrCreateActive1to1(fromUserId, event.to).id;
  } else {
    return { delivered: false };
  }

  // Nunca confie cegamente na lista de destinatários do cliente — só encaminha chaves
  // destinadas a usuários que são de fato participantes aceitos desta conversa.
  const acceptedParticipantIds = new Set(conversationsRepository.findAcceptedParticipantIds(conversationId));
  const recipientKeys = event.recipientKeys.filter((rk) => acceptedParticipantIds.has(rk.userId));

  const saved = messagesRepository.create({
    conversationId,
    fromUserId,
    ciphertext: event.ciphertext,
    iv: event.iv,
    recipientKeys,
  });

  let delivered = false;
  for (const recipientKey of recipientKeys) {
    if (recipientKey.userId === fromUserId) continue;
    const recipient = registry.get(recipientKey.userId);
    if (!recipient) continue;

    const outgoing: ServerEvent = {
      type: "message",
      conversationId,
      from: fromUserId,
      ciphertext: event.ciphertext,
      iv: event.iv,
      encryptedAesKey: recipientKey.encryptedAesKey,
      createdAt: saved.createdAt,
    };
    recipient.send(outgoing);
    delivered = true;
  }

  return { delivered };
}
