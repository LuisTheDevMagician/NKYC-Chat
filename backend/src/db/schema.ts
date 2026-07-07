import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  salt: text("salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  // RSA public key + the private key wrapped (AES-GCM) with a key derived from the
  // user's password, so the same key pair can be recovered on future logins instead
  // of rotating every session — otherwise message history is never readable again.
  publicKey: text("public_key").notNull(),
  wrappedPrivateKey: text("wrapped_private_key").notNull(),
  wrapIv: text("wrap_iv").notNull(),
  keySalt: text("key_salt").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
});

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userAId: integer("user_a_id")
    .notNull()
    .references(() => users.id),
  userBId: integer("user_b_id")
    .notNull()
    .references(() => users.id),
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at"),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  fromUserId: integer("from_user_id")
    .notNull()
    .references(() => users.id),
  toUserId: integer("to_user_id")
    .notNull()
    .references(() => users.id),
  ciphertext: text("ciphertext").notNull(),
  encryptedAesKey: text("encrypted_aes_key").notNull(),
  encryptedAesKeyForSender: text("encrypted_aes_key_for_sender").notNull(),
  iv: text("iv").notNull(),
  createdAt: integer("created_at").notNull(),
});
