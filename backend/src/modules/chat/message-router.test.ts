import { describe, expect, it } from "bun:test";
import { createDb } from "../../db/client";
import { createUsersRepository } from "../../db/users.repository";
import { createMessagesRepository } from "../../db/messages.repository";
import { createConnectionRegistry, type Connection } from "./connection-registry";
import { routeMessage } from "./message-router";

function setup() {
  const database = createDb(":memory:");
  const users = createUsersRepository(database);
  const alice = users.create("alice", "s", "h");
  const bob = users.create("bob", "s", "h");
  return {
    messagesRepository: createMessagesRepository(database),
    registry: createConnectionRegistry(),
    alice,
    bob,
  };
}

describe("routeMessage", () => {
  it("delivers to an online recipient and persists the message", () => {
    const { messagesRepository, registry, alice, bob } = setup();
    const received: unknown[] = [];
    const bobConnection: Connection = {
      userId: bob.id,
      username: bob.username,
      publicKey: "bob-pk",
      send: (event) => received.push(event),
    };
    registry.add(bobConnection);

    const result = routeMessage(registry, messagesRepository, alice.id, {
      type: "message",
      to: bob.id,
      ciphertext: "cipher",
      iv: "iv",
      encryptedAesKey: "key",
    });

    expect(result.delivered).toBe(true);
    expect(received).toHaveLength(1);
    expect(messagesRepository.findConversation(alice.id, bob.id)).toHaveLength(1);
  });

  it("persists but reports not-delivered when recipient is offline", () => {
    const { messagesRepository, registry, alice, bob } = setup();

    const result = routeMessage(registry, messagesRepository, alice.id, {
      type: "message",
      to: bob.id,
      ciphertext: "cipher",
      iv: "iv",
      encryptedAesKey: "key",
    });

    expect(result.delivered).toBe(false);
    expect(messagesRepository.findConversation(alice.id, bob.id)).toHaveLength(1);
  });

  it("rejects and does not persist a message a user sends to themselves", () => {
    const { messagesRepository, registry, alice } = setup();
    const received: unknown[] = [];
    registry.add({
      userId: alice.id,
      username: alice.username,
      publicKey: "alice-pk",
      send: (event) => received.push(event),
    });

    const result = routeMessage(registry, messagesRepository, alice.id, {
      type: "message",
      to: alice.id,
      ciphertext: "cipher",
      iv: "iv",
      encryptedAesKey: "key",
    });

    expect(result.delivered).toBe(false);
    expect(received).toHaveLength(0);
    expect(messagesRepository.findConversation(alice.id, alice.id)).toHaveLength(0);
  });
});
