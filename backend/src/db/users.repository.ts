import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { users } from "./schema";

export type UserRow = typeof users.$inferSelect;

export interface CreateUserInput {
  username: string;
  salt: string;
  passwordHash: string;
  publicKey: string;
  wrappedPrivateKey: string;
  wrapIv: string;
  keySalt: string;
}

export function createUsersRepository(database: Db) {
  return {
    findByUsername(username: string): UserRow | null {
      return database.select().from(users).where(eq(users.username, username)).get() ?? null;
    },
    findById(id: number): UserRow | null {
      return database.select().from(users).where(eq(users.id, id)).get() ?? null;
    },
    create(input: CreateUserInput): UserRow {
      database
        .insert(users)
        .values({ ...input, createdAt: Date.now() })
        .run();
      return database.select().from(users).where(eq(users.username, input.username)).get()!;
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
