import { t } from "elysia";

export const conversationParams = t.Object({
  withUserId: t.Numeric(),
});
export type ConversationParams = typeof conversationParams.static;

export const messageDto = t.Object({
  id: t.Number(),
  fromUserId: t.Number(),
  toUserId: t.Number(),
  ciphertext: t.String(),
  encryptedAesKey: t.String(),
  iv: t.String(),
  createdAt: t.Number(),
});
export type MessageDto = typeof messageDto.static;
