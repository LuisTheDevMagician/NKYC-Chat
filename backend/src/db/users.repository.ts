import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { users } from "./schema";

export type UserRow = typeof users.$inferSelect;

export function createUsersRepository(database: Db) {
  return {
    findByUsername(username: string): UserRow | null {
      return database.select().from(users).where(eq(users.username, username)).get() ?? null;
    },
    findById(id: number): UserRow | null {
      return database.select().from(users).where(eq(users.id, id)).get() ?? null;
    },
    create(username: string, salt: string, passwordHash: string): UserRow {
      database
        .insert(users)
        .values({ username, salt, passwordHash, createdAt: Date.now() })
        .run();
      return database.select().from(users).where(eq(users.username, username)).get()!;
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
