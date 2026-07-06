import { and, asc, eq, or } from "drizzle-orm";
import type { Db } from "./client";
import { messages } from "./schema";

export type MessageRow = typeof messages.$inferSelect;

export interface CreateMessageInput {
  fromUserId: number;
  toUserId: number;
  ciphertext: string;
  encryptedAesKey: string;
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
    findConversation(userAId: number, userBId: number): MessageRow[] {
      return database
        .select()
        .from(messages)
        .where(
          or(
            and(eq(messages.fromUserId, userAId), eq(messages.toUserId, userBId)),
            and(eq(messages.fromUserId, userBId), eq(messages.toUserId, userAId))
          )
        )
        .orderBy(asc(messages.createdAt))
        .all();
    },
  };
}

export type MessagesRepository = ReturnType<typeof createMessagesRepository>;
