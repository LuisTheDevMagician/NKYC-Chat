export interface RecipientKey {
  userId: number;
  encryptedAesKey: string;
}

export type ClientEvent =
  | { type: "hello"; publicKey: string }
  | {
      type: "message";
      to?: number;
      conversationId?: number;
      ciphertext: string;
      iv: string;
      recipientKeys: RecipientKey[];
    }
  | { type: "typing"; to?: number; conversationId?: number }
  | { type: "create-group"; participantIds: number[]; name?: string }
  | { type: "respond-group-invite"; conversationId: number; response: "accepted" | "declined" };

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
      createdBy: { id: number; username: string };
      participantUsernames: string[];
    }
  | { type: "group-ended"; conversationId: number }
  | { type: "error"; reason: string };
