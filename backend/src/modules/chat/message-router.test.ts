import { describe, expect, it } from "bun:test";
import { createDb } from "../../db/client";
import { createUsersRepository } from "../../db/users.repository";
import { createMessagesRepository } from "../../db/messages.repository";
import { createConversationsRepository } from "../../db/conversations.repository";
import { testUserInput } from "../../db/test-helpers";
import { createConnectionRegistry, type Connection } from "./connection-registry";
import { routeMessage } from "./message-router";

function setup() {
  const database = createDb(":memory:");
  const users = createUsersRepository(database);
  const alice = users.create(testUserInput("alice"));
  const bob = users.create(testUserInput("bob"));
  return {
    messagesRepository: createMessagesRepository(database),
    conversationsRepository: createConversationsRepository(database),
    registry: createConnectionRegistry(),
    alice,
    bob,
  };
}

describe("routeMessage", () => {
  it("delivers to an online recipient and persists the message under a new conversation", () => {
    const { messagesRepository, conversationsRepository, registry, alice, bob } = setup();
    const received: unknown[] = [];
    const bobConnection: Connection = {
      userId: bob.id,
      username: bob.username,
      publicKey: "bob-pk",
      send: (event) => received.push(event),
    };
    registry.add(bobConnection);

    const result = routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      to: bob.id,
      ciphertext: "cipher",
      iv: "iv",
      encryptedAesKey: "key",
      encryptedAesKeyForSender: "key-for-sender",
    });

    expect(result.delivered).toBe(true);
    expect(received).toHaveLength(1);

    const conversation = conversationsRepository.findActive(alice.id, bob.id);
    expect(conversation).toBeDefined();
    expect(messagesRepository.findByConversationId(conversation!.id)).toHaveLength(1);
  });

  it("persists but reports not-delivered when recipient is offline", () => {
    const { messagesRepository, conversationsRepository, registry, alice, bob } = setup();

    const result = routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      to: bob.id,
      ciphertext: "cipher",
      iv: "iv",
      encryptedAesKey: "key",
      encryptedAesKeyForSender: "key-for-sender",
    });

    expect(result.delivered).toBe(false);
    const conversation = conversationsRepository.findActive(alice.id, bob.id);
    expect(messagesRepository.findByConversationId(conversation!.id)).toHaveLength(1);
  });

  it("reuses the same active conversation across multiple messages", () => {
    const { messagesRepository, conversationsRepository, registry, alice, bob } = setup();

    routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      to: bob.id,
      ciphertext: "c1",
      iv: "iv1",
      encryptedAesKey: "key1",
      encryptedAesKeyForSender: "key1-sender",
    });
    routeMessage(registry, messagesRepository, conversationsRepository, bob.id, {
      type: "message",
      to: alice.id,
      ciphertext: "c2",
      iv: "iv2",
      encryptedAesKey: "key2",
      encryptedAesKeyForSender: "key2-sender",
    });

    const conversation = conversationsRepository.findActive(alice.id, bob.id);
    expect(messagesRepository.findByConversationId(conversation!.id)).toHaveLength(2);
  });

  it("rejects and does not persist a message a user sends to themselves", () => {
    const { messagesRepository, conversationsRepository, registry, alice } = setup();
    const received: unknown[] = [];
    registry.add({
      userId: alice.id,
      username: alice.username,
      publicKey: "alice-pk",
      send: (event) => received.push(event),
    });

    const result = routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      to: alice.id,
      ciphertext: "cipher",
      iv: "iv",
      encryptedAesKey: "key",
      encryptedAesKeyForSender: "key-for-sender",
    });

    expect(result.delivered).toBe(false);
    expect(received).toHaveLength(0);
    expect(conversationsRepository.findActive(alice.id, alice.id)).toBeUndefined();
  });
});
