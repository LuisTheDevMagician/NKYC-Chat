import { and, asc, eq } from "drizzle-orm";
import type { Db } from "./client";
import { messageRecipientKeys, messages } from "./schema";

export type MessageRow = typeof messages.$inferSelect;

export interface RecipientKey {
  userId: number;
  encryptedAesKey: string;
}

export interface CreateMessageInput {
  conversationId: number;
  fromUserId: number;
  ciphertext: string;
  iv: string;
  recipientKeys: RecipientKey[];
}

export interface MessageWithKey {
  id: number;
  conversationId: number;
  fromUserId: number;
  ciphertext: string;
  iv: string;
  createdAt: number;
  /** This requesting user's copy of the AES key, or null if none was stored for them. */
  encryptedAesKey: string | null;
}

export function createMessagesRepository(database: Db) {
  return {
    create(input: CreateMessageInput): MessageRow {
      const { recipientKeys, ...messageFields } = input;
      const message = database
        .insert(messages)
        .values({ ...messageFields, createdAt: Date.now() })
        .returning()
        .get();

      if (recipientKeys.length > 0) {
        database
          .insert(messageRecipientKeys)
          .values(recipientKeys.map((rk) => ({ messageId: message.id, ...rk })))
          .run();
      }

      return message;
    },

    findByConversationIdForUser(conversationId: number, userId: number): MessageWithKey[] {
      return database
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          fromUserId: messages.fromUserId,
          ciphertext: messages.ciphertext,
          iv: messages.iv,
          createdAt: messages.createdAt,
          encryptedAesKey: messageRecipientKeys.encryptedAesKey,
        })
        .from(messages)
        .leftJoin(
          messageRecipientKeys,
          and(eq(messageRecipientKeys.messageId, messages.id), eq(messageRecipientKeys.userId, userId))
        )
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt))
        .all() as MessageWithKey[];
    },
  };
}

export type MessagesRepository = ReturnType<typeof createMessagesRepository>;
