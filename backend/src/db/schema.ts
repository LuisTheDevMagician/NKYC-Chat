import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  salt: text("salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  // Chave pública RSA + a chave privada empacotada (AES-GCM) com uma chave derivada da
  // senha do usuário, para que o mesmo par de chaves possa ser recuperado em logins
  // futuros em vez de rotacionar a cada sessão — caso contrário o histórico de mensagens
  // nunca mais seria legível.
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
  // Nulo para conversas 1:1; preenchido para grupos (quando não é informado na criação,
  // o cliente gera um nome a partir dos nomes de usuário dos participantes).
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
  // 'invited' | 'accepted' | 'declined' — em conversas 1:1 os participantes começam (e continuam) 'accepted'.
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

// Uma linha por destinatário (incluindo a cópia do próprio remetente), cada uma guardando
// a chave AES desta mensagem cifrada especificamente com a chave pública RSA daquele usuário.
// Substitui colunas fixas encryptedAesKey/encryptedAesKeyForSender para que mensagens 1:1 e
// de grupo (qualquer número de destinatários) compartilhem o mesmo formato.
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
