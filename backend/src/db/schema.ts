import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  salt: text("salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromUserId: integer("from_user_id")
    .notNull()
    .references(() => users.id),
  toUserId: integer("to_user_id")
    .notNull()
    .references(() => users.id),
  ciphertext: text("ciphertext").notNull(),
  encryptedAesKey: text("encrypted_aes_key").notNull(),
  iv: text("iv").notNull(),
  createdAt: integer("created_at").notNull(),
});
