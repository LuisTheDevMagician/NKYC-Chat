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
  // Null for 1:1 conversations; set for groups (falls back to a name generated from
  // member usernames on the client when not provided at creation).
  name: text("name"),
  isGroup: integer("is_group", { mode: "boolean" }).notNull().default(false),
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at"),
});

export const conversationParticipants = sqliteTable("conversation_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  // 'invited' | 'accepted' | 'declined' — 1:1 participants start (and stay) 'accepted'.
  status: text("status").notNull(),
  invitedAt: integer("invited_at").notNull(),
  respondedAt: integer("responded_at"),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  fromUserId: integer("from_user_id")
    .notNull()
    .references(() => users.id),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  createdAt: integer("created_at").notNull(),
});

// One row per recipient (including the sender's own copy), each holding the AES key
// for this message encrypted specifically with that user's RSA public key. Replaces
// fixed encryptedAesKey/encryptedAesKeyForSender columns so 1:1 and group messages
// (any number of recipients) share the same shape.
export const messageRecipientKeys = sqliteTable("message_recipient_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id")
    .notNull()
    .references(() => messages.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  encryptedAesKey: text("encrypted_aes_key").notNull(),
});
