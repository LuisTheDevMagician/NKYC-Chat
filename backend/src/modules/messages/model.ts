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
  ciphertext: t.String(),
  iv: t.String(),
  createdAt: t.Number(),
  encryptedAesKey: t.Union([t.String(), t.Null()]),
});
export type MessageDto = typeof messageDto.static;

export const conversationHistoryEntryDto = t.Object({
  id: t.Number(),
  title: t.String(),
  isGroup: t.Boolean(),
  startedAt: t.Number(),
  endedAt: t.Number(),
});
export type ConversationHistoryEntryDto = typeof conversationHistoryEntryDto.static;

export const activeGroupMemberDto = t.Object({
  id: t.Number(),
  username: t.String(),
});

export const activeGroupDto = t.Object({
  id: t.Number(),
  name: t.String(),
  members: t.Array(activeGroupMemberDto),
});
export type ActiveGroupDto = typeof activeGroupDto.static;
