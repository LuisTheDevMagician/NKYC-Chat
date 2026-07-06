import { t } from "elysia";

export const clientHello = t.Object({
  type: t.Literal("hello"),
  publicKey: t.String(),
});

export const clientMessage = t.Object({
  type: t.Literal("message"),
  to: t.Number(),
  ciphertext: t.String(),
  iv: t.String(),
  encryptedAesKey: t.String(),
});

export const clientTyping = t.Object({
  type: t.Literal("typing"),
  to: t.Number(),
});

export const clientEvent = t.Union([clientHello, clientMessage, clientTyping]);
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
      from: number;
      ciphertext: string;
      iv: string;
      encryptedAesKey: string;
      createdAt: number;
    }
  | { type: "typing"; from: number }
  | { type: "error"; reason: string };
