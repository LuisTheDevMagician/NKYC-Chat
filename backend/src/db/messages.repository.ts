import { asc, eq } from "drizzle-orm";
import type { Db } from "./client";
import { messages } from "./schema";

export type MessageRow = typeof messages.$inferSelect;

export interface CreateMessageInput {
  conversationId: number;
  fromUserId: number;
  toUserId: number;
  ciphertext: string;
  encryptedAesKey: string;
  encryptedAesKeyForSender: string;
  iv: string;
}

export function createMessagesRepository(database: Db) {
  return {
    create(input: CreateMessageInput): MessageRow {
      return database
        .insert(messages)
        .values({ ...input, createdAt: Date.now() })
        .returning()
        .get();
    },
    findByConversationId(conversationId: number): MessageRow[] {
      return database
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt))
        .all();
    },
  };
}

export type MessagesRepository = ReturnType<typeof createMessagesRepository>;
