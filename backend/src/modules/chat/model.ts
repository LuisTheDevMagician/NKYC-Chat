import { t } from "elysia";

export const clientHello = t.Object({
  type: t.Literal("hello"),
  publicKey: t.String(),
});

export const recipientKey = t.Object({
  userId: t.Number(),
  encryptedAesKey: t.String(),
});

export const clientMessage = t.Object({
  type: t.Literal("message"),
  // 1:1: id do usuário destinatário; o servidor resolve/cria a conversa.
  to: t.Optional(t.Number()),
  // Grupo (ou uma conversa já conhecida): id explícito da conversa.
  conversationId: t.Optional(t.Number()),
  ciphertext: t.String(),
  iv: t.String(),
  // Chave AES desta mensagem, cifrada uma vez por participante aceito (incluindo o remetente).
  recipientKeys: t.Array(recipientKey),
});

export const clientTyping = t.Object({
  type: t.Literal("typing"),
  to: t.Optional(t.Number()),
  conversationId: t.Optional(t.Number()),
});

export const clientCreateGroup = t.Object({
  type: t.Literal("create-group"),
  participantIds: t.Array(t.Number()),
  name: t.Optional(t.String()),
});

export const clientRespondGroupInvite = t.Object({
  type: t.Literal("respond-group-invite"),
  conversationId: t.Number(),
  response: t.Union([t.Literal("accepted"), t.Literal("declined")]),
});

export const clientEvent = t.Union([
  clientHello,
  clientMessage,
  clientTyping,
  clientCreateGroup,
  clientRespondGroupInvite,
]);
export type ClientEvent = typeof clientEvent.static;

export interface PresenceUser {
  id: number;
  username: string;
  publicKey: string;
}

export type ServerEvent =
  | { type: "presence"; users: PresenceUser[] }
  | {
      type: "message";
      conversationId: number;
      from: number;
      ciphertext: string;
      iv: string;
      encryptedAesKey: string;
      createdAt: number;
    }
  | { type: "typing"; from: number; conversationId?: number }
  | {
      type: "group-invite";
      conversationId: number;
      name: string;
      createdBy: PresenceUser;
      participantUsernames: string[];
    }
  | { type: "group-ended"; conversationId: number }
  | { type: "group-joined"; conversationId: number }
  | { type: "error"; reason: string };
