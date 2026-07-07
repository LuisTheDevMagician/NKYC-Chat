import { t } from "elysia";

export const activeConversationParams = t.Object({
  withUserId: t.Numeric(),
});
export type ActiveConversationParams = typeof activeConversationParams.static;

export const historyDetailParams = t.Object({
  conversationId: t.Numeric(),
});
export type HistoryDetailParams = typeof historyDetailParams.static;

export const messageDto = t.Object({
  id: t.Number(),
  conversationId: t.Number(),
  fromUserId: t.Number(),
  toUserId: t.Number(),
  ciphertext: t.String(),
  encryptedAesKey: t.String(),
  encryptedAesKeyForSender: t.String(),
  iv: t.String(),
  createdAt: t.Number(),
});
export type MessageDto = typeof messageDto.static;

export const conversationHistoryEntryDto = t.Object({
  id: t.Number(),
  peerId: t.Number(),
  peerUsername: t.String(),
  startedAt: t.Number(),
  endedAt: t.Number(),
});
export type ConversationHistoryEntryDto = typeof conversationHistoryEntryDto.static;
