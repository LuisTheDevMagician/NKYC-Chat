import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { sessions } from "./schema";

export type SessionRow = typeof sessions.$inferSelect;

export function createSessionsRepository(database: Db) {
  return {
    create(token: string, userId: number, expiresAt: number): SessionRow {
      database.insert(sessions).values({ token, userId, expiresAt }).run();
      return { token, userId, expiresAt };
    },
    findByToken(token: string): SessionRow | null {
      return database.select().from(sessions).where(eq(sessions.token, token)).get() ?? null;
    },
    deleteByToken(token: string): void {
      database.delete(sessions).where(eq(sessions.token, token)).run();
    },
  };
}

export type SessionsRepository = ReturnType<typeof createSessionsRepository>;
