export type ClientEvent =
  | { type: "hello"; publicKey: string }
  | { type: "message"; to: number; ciphertext: string; iv: string; encryptedAesKey: string }
  | { type: "typing"; to: number };

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
