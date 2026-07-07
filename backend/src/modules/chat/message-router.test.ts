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
  const carol = users.create(testUserInput("carol"));
  return {
    messagesRepository: createMessagesRepository(database),
    conversationsRepository: createConversationsRepository(database),
    registry: createConnectionRegistry(),
    alice,
    bob,
    carol,
  };
}

function connectionFor(user: { id: number; username: string }, received: unknown[]): Connection {
  return {
    userId: user.id,
    username: user.username,
    publicKey: `${user.username}-pk`,
    send: (event) => received.push(event),
  };
}

describe("routeMessage — 1:1 via `to`", () => {
  it("delivers to an online recipient and persists the message under a new conversation", () => {
    const { messagesRepository, conversationsRepository, registry, alice, bob } = setup();
    const received: unknown[] = [];
    registry.add(connectionFor(bob, received));

    const result = routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      to: bob.id,
      ciphertext: "cipher",
      iv: "iv",
      recipientKeys: [
        { userId: bob.id, encryptedAesKey: "key-for-bob" },
        { userId: alice.id, encryptedAesKey: "key-for-alice" },
      ],
    });

    expect(result.delivered).toBe(true);
    expect(received).toHaveLength(1);

    const conversation = conversationsRepository.findActive1to1(alice.id, bob.id);
    expect(conversation).toBeDefined();
    expect(messagesRepository.findByConversationIdForUser(conversation!.id, bob.id)).toHaveLength(1);
  });

  it("persists but reports not-delivered when recipient is offline", () => {
    const { messagesRepository, conversationsRepository, registry, alice, bob } = setup();

    const result = routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      to: bob.id,
      ciphertext: "cipher",
      iv: "iv",
      recipientKeys: [{ userId: bob.id, encryptedAesKey: "key" }],
    });

    expect(result.delivered).toBe(false);
    const conversation = conversationsRepository.findActive1to1(alice.id, bob.id);
    expect(messagesRepository.findByConversationIdForUser(conversation!.id, bob.id)).toHaveLength(1);
  });

  it("reuses the same active conversation across multiple messages", () => {
    const { messagesRepository, conversationsRepository, registry, alice, bob } = setup();

    routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      to: bob.id,
      ciphertext: "c1",
      iv: "iv1",
      recipientKeys: [{ userId: bob.id, encryptedAesKey: "key1" }],
    });
    routeMessage(registry, messagesRepository, conversationsRepository, bob.id, {
      type: "message",
      to: alice.id,
      ciphertext: "c2",
      iv: "iv2",
      recipientKeys: [{ userId: alice.id, encryptedAesKey: "key2" }],
    });

    const conversation = conversationsRepository.findActive1to1(alice.id, bob.id);
    expect(messagesRepository.findByConversationIdForUser(conversation!.id, alice.id)).toHaveLength(2);
  });

  it("rejects and does not persist a message a user sends to themselves", () => {
    const { messagesRepository, conversationsRepository, registry, alice } = setup();
    const received: unknown[] = [];
    registry.add(connectionFor(alice, received));

    const result = routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      to: alice.id,
      ciphertext: "cipher",
      iv: "iv",
      recipientKeys: [{ userId: alice.id, encryptedAesKey: "key" }],
    });

    expect(result.delivered).toBe(false);
    expect(received).toHaveLength(0);
    expect(conversationsRepository.findActive1to1(alice.id, alice.id)).toBeUndefined();
  });
});

describe("routeMessage — groups via `conversationId`", () => {
  it("delivers to every online accepted participant except the sender", () => {
    const { messagesRepository, conversationsRepository, registry, alice, bob, carol } = setup();
    const group = conversationsRepository.createGroup(alice.id, [bob.id, carol.id], "Amigos");
    conversationsRepository.respondToInvite(group.id, bob.id, "accepted");
    conversationsRepository.respondToInvite(group.id, carol.id, "accepted");

    const aliceReceived: unknown[] = [];
    const bobReceived: unknown[] = [];
    registry.add(connectionFor(alice, aliceReceived));
    registry.add(connectionFor(bob, bobReceived));
    // carol stays offline

    const result = routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      conversationId: group.id,
      ciphertext: "cipher",
      iv: "iv",
      recipientKeys: [
        { userId: alice.id, encryptedAesKey: "key-alice" },
        { userId: bob.id, encryptedAesKey: "key-bob" },
        { userId: carol.id, encryptedAesKey: "key-carol" },
      ],
    });

    expect(result.delivered).toBe(true);
    expect(aliceReceived).toHaveLength(0);
    expect(bobReceived).toHaveLength(1);

    expect(messagesRepository.findByConversationIdForUser(group.id, carol.id)[0].encryptedAesKey).toBe("key-carol");
  });

  it("rejects sending to a conversation the user isn't an accepted participant of", () => {
    const { messagesRepository, conversationsRepository, registry, alice, bob, carol } = setup();
    const group = conversationsRepository.createGroup(alice.id, [bob.id], null);

    const result = routeMessage(registry, messagesRepository, conversationsRepository, carol.id, {
      type: "message",
      conversationId: group.id,
      ciphertext: "cipher",
      iv: "iv",
      recipientKeys: [{ userId: carol.id, encryptedAesKey: "key" }],
    });

    expect(result.delivered).toBe(false);
  });

  it("drops recipient keys for users who aren't accepted participants", () => {
    const { messagesRepository, conversationsRepository, registry, alice, bob, carol } = setup();
    const group = conversationsRepository.createGroup(alice.id, [bob.id], null);
    conversationsRepository.respondToInvite(group.id, bob.id, "accepted");

    routeMessage(registry, messagesRepository, conversationsRepository, alice.id, {
      type: "message",
      conversationId: group.id,
      ciphertext: "cipher",
      iv: "iv",
      recipientKeys: [
        { userId: alice.id, encryptedAesKey: "key-alice" },
        { userId: bob.id, encryptedAesKey: "key-bob" },
        { userId: carol.id, encryptedAesKey: "key-carol-not-a-member" },
      ],
    });

    expect(messagesRepository.findByConversationIdForUser(group.id, carol.id)[0].encryptedAesKey).toBeNull();
  });
});
