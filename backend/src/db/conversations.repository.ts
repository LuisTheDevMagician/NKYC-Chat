import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { Db } from "./client";
import { conversationParticipants, conversations, users } from "./schema";

export type ConversationRow = typeof conversations.$inferSelect;
export type ParticipantRow = typeof conversationParticipants.$inferSelect;
export type ParticipantStatus = "invited" | "accepted" | "declined";

export interface ParticipantWithUser {
  userId: number;
  username: string;
  status: ParticipantStatus;
}

export interface ConversationHistoryEntry {
  id: number;
  title: string;
  isGroup: boolean;
  startedAt: number;
  endedAt: number;
}

export interface ActiveGroupMember {
  id: number;
  username: string;
}

export interface ActiveGroupEntry {
  id: number;
  name: string;
  members: ActiveGroupMember[];
}

function participantsWithUsers(database: Db, conversationId: number): ParticipantWithUser[] {
  return database
    .select({
      userId: conversationParticipants.userId,
      username: users.username,
      status: conversationParticipants.status,
    })
    .from(conversationParticipants)
    .innerJoin(users, eq(users.id, conversationParticipants.userId))
    .where(eq(conversationParticipants.conversationId, conversationId))
    .all() as ParticipantWithUser[];
}

/** Ends the conversation if it can no longer proceed: everyone has responded and fewer than 2 accepted. */
function endIfUnviable(database: Db, conversationId: number): void {
  const rows = database
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId))
    .all();
  const stillPending = rows.some((r) => r.status === "invited");
  const acceptedCount = rows.filter((r) => r.status === "accepted").length;
  if (!stillPending && acceptedCount < 2) {
    database
      .update(conversations)
      .set({ endedAt: Date.now() })
      .where(and(eq(conversations.id, conversationId), isNull(conversations.endedAt)))
      .run();
  }
}

export function createConversationsRepository(database: Db) {
  return {
    findActive1to1(userAId: number, userBId: number): ConversationRow | undefined {
      const rows = database
        .select({ conversation: conversations })
        .from(conversationParticipants)
        .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
        .where(
          and(
            eq(conversations.isGroup, false),
            isNull(conversations.endedAt),
            inArray(conversationParticipants.userId, [userAId, userBId]),
            eq(conversationParticipants.status, "accepted")
          )
        )
        .all();

      const counts = new Map<number, number>();
      for (const row of rows) counts.set(row.conversation.id, (counts.get(row.conversation.id) ?? 0) + 1);
      const match = rows.find((row) => counts.get(row.conversation.id) === 2);
      return match?.conversation;
    },

    getOrCreateActive1to1(userAId: number, userBId: number): ConversationRow {
      const existing = this.findActive1to1(userAId, userBId);
      if (existing) return existing;

      const now = Date.now();
      const conversation = database
        .insert(conversations)
        .values({ isGroup: false, startedAt: now })
        .returning()
        .get();

      database
        .insert(conversationParticipants)
        .values([
          { conversationId: conversation.id, userId: userAId, status: "accepted", invitedAt: now, respondedAt: now },
          { conversationId: conversation.id, userId: userBId, status: "accepted", invitedAt: now, respondedAt: now },
        ])
        .run();

      return conversation;
    },

    createGroup(creatorId: number, invitedUserIds: number[], name: string | null): ConversationRow {
      const now = Date.now();
      const conversation = database
        .insert(conversations)
        .values({ isGroup: true, name, startedAt: now })
        .returning()
        .get();

      database
        .insert(conversationParticipants)
        .values([
          { conversationId: conversation.id, userId: creatorId, status: "accepted", invitedAt: now, respondedAt: now },
          ...invitedUserIds.map((userId) => ({
            conversationId: conversation.id,
            userId,
            status: "invited" as const,
            invitedAt: now,
            respondedAt: null,
          })),
        ])
        .run();

      return conversation;
    },

    respondToInvite(conversationId: number, userId: number, response: "accepted" | "declined"): void {
      database
        .update(conversationParticipants)
        .set({ status: response, respondedAt: Date.now() })
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, userId),
            eq(conversationParticipants.status, "invited")
          )
        )
        .run();

      if (response === "declined") endIfUnviable(database, conversationId);
    },

    endAllActiveForUser(userId: number): void {
      const acceptedConversationIds = database
        .select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .where(and(eq(conversationParticipants.userId, userId), eq(conversationParticipants.status, "accepted")))
        .all()
        .map((r) => r.conversationId);

      if (acceptedConversationIds.length === 0) return;

      database
        .update(conversations)
        .set({ endedAt: Date.now() })
        .where(and(isNull(conversations.endedAt), inArray(conversations.id, acceptedConversationIds)))
        .run();
    },

    declineAllPendingForUser(userId: number): void {
      const pending = database
        .select()
        .from(conversationParticipants)
        .where(and(eq(conversationParticipants.userId, userId), eq(conversationParticipants.status, "invited")))
        .all();

      for (const row of pending) {
        database
          .update(conversationParticipants)
          .set({ status: "declined", respondedAt: Date.now() })
          .where(eq(conversationParticipants.id, row.id))
          .run();
        endIfUnviable(database, row.conversationId);
      }
    },

    findById(id: number): ConversationRow | undefined {
      return database.select().from(conversations).where(eq(conversations.id, id)).get();
    },

    findParticipants(conversationId: number): ParticipantWithUser[] {
      return participantsWithUsers(database, conversationId);
    },

    findAcceptedParticipantIds(conversationId: number): number[] {
      return database
        .select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.status, "accepted")
          )
        )
        .all()
        .map((r) => r.userId);
    },

    isAcceptedParticipant(conversationId: number, userId: number): boolean {
      const row = database
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, userId),
            eq(conversationParticipants.status, "accepted")
          )
        )
        .get();
      return !!row;
    },

    findActiveGroupsForUser(userId: number): ActiveGroupEntry[] {
      const groupIds = database
        .select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
        .where(
          and(
            eq(conversationParticipants.userId, userId),
            eq(conversationParticipants.status, "accepted"),
            eq(conversations.isGroup, true),
            isNull(conversations.endedAt)
          )
        )
        .all()
        .map((r) => r.conversationId);

      return groupIds.map((id) => {
        const conversation = this.findById(id)!;
        const members = participantsWithUsers(database, id).filter((p) => p.status === "accepted");
        const name = conversation.name ?? members.map((m) => m.username).join(", ");
        return { id, name, members: members.map((m) => ({ id: m.userId, username: m.username })) };
      });
    },

    findHistoryForUser(userId: number): ConversationHistoryEntry[] {
      const conversationIds = database
        .select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
        .where(and(eq(conversationParticipants.userId, userId), isNotNull(conversations.endedAt)))
        .all()
        .map((r) => r.conversationId);

      const rows = conversationIds
        .map((id) => this.findById(id)!)
        .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));

      return rows.map((row) => {
        const members = participantsWithUsers(database, row.id).filter(
          (p) => p.userId !== userId && p.status !== "declined"
        );
        const title = row.isGroup
          ? (row.name ?? members.map((m) => m.username).join(", "))
          : (members[0]?.username ?? "desconhecido");
        return {
          id: row.id,
          title,
          isGroup: row.isGroup,
          startedAt: row.startedAt,
          endedAt: row.endedAt as number,
        };
      });
    },
  };
}

export type ConversationsRepository = ReturnType<typeof createConversationsRepository>;
