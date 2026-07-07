import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import type { Db } from "./client";
import { conversations, users } from "./schema";

export type ConversationRow = typeof conversations.$inferSelect;

export interface ConversationHistoryEntry {
  id: number;
  peerId: number;
  peerUsername: string;
  startedAt: number;
  endedAt: number;
}

function findActiveQuery(database: Db, userAId: number, userBId: number): ConversationRow | undefined {
  return database
    .select()
    .from(conversations)
    .where(
      and(
        isNull(conversations.endedAt),
        or(
          and(eq(conversations.userAId, userAId), eq(conversations.userBId, userBId)),
          and(eq(conversations.userAId, userBId), eq(conversations.userBId, userAId))
        )
      )
    )
    .get();
}

export function createConversationsRepository(database: Db) {
  return {
    findActive(userAId: number, userBId: number): ConversationRow | undefined {
      return findActiveQuery(database, userAId, userBId);
    },

    getOrCreateActive(userAId: number, userBId: number): ConversationRow {
      const existing = findActiveQuery(database, userAId, userBId);
      if (existing) return existing;

      return database
        .insert(conversations)
        .values({ userAId, userBId, startedAt: Date.now(), endedAt: null })
        .returning()
        .get();
    },

    endAllActiveForUser(userId: number): void {
      database
        .update(conversations)
        .set({ endedAt: Date.now() })
        .where(
          and(
            isNull(conversations.endedAt),
            or(eq(conversations.userAId, userId), eq(conversations.userBId, userId))
          )
        )
        .run();
    },

    findById(id: number): ConversationRow | undefined {
      return database.select().from(conversations).where(eq(conversations.id, id)).get();
    },

    findHistoryForUser(userId: number): ConversationHistoryEntry[] {
      const rows = database
        .select()
        .from(conversations)
        .where(
          and(
            isNotNull(conversations.endedAt),
            or(eq(conversations.userAId, userId), eq(conversations.userBId, userId))
          )
        )
        .orderBy(desc(conversations.endedAt))
        .all();

      return rows.map((row) => {
        const peerId = row.userAId === userId ? row.userBId : row.userAId;
        const peer = database.select().from(users).where(eq(users.id, peerId)).get();
        return {
          id: row.id,
          peerId,
          peerUsername: peer?.username ?? "desconhecido",
          startedAt: row.startedAt,
          endedAt: row.endedAt as number,
        };
      });
    },
  };
}

export type ConversationsRepository = ReturnType<typeof createConversationsRepository>;
