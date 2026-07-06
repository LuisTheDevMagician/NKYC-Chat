import { describe, expect, it } from "bun:test";
import { createDb } from "./client";
import { createUsersRepository } from "./users.repository";
import { createMessagesRepository } from "./messages.repository";

function setup() {
  const database = createDb(":memory:");
  const users = createUsersRepository(database);
  const messages = createMessagesRepository(database);
  const alice = users.create("alice", "s", "h");
  const bob = users.create("bob", "s", "h");
  return { messages, users, alice, bob };
}

describe("messages repository", () => {
  it("stores a message and retrieves the conversation in order", () => {
    const { messages, alice, bob } = setup();
    messages.create({
      fromUserId: alice.id,
      toUserId: bob.id,
      ciphertext: "c1",
      encryptedAesKey: "k1",
      iv: "iv1",
    });
    messages.create({
      fromUserId: bob.id,
      toUserId: alice.id,
      ciphertext: "c2",
      encryptedAesKey: "k2",
      iv: "iv2",
    });

    const conversation = messages.findConversation(alice.id, bob.id);
    expect(conversation).toHaveLength(2);
    expect(conversation[0].ciphertext).toBe("c1");
    expect(conversation[1].ciphertext).toBe("c2");
  });

  it("does not include messages from unrelated conversations", () => {
    const { messages, users, alice, bob } = setup();
    const carol = users.create("carol", "s", "h");

    messages.create({
      fromUserId: alice.id,
      toUserId: bob.id,
      ciphertext: "c1",
      encryptedAesKey: "k1",
      iv: "iv1",
    });

    expect(messages.findConversation(alice.id, carol.id)).toHaveLength(0);
  });
});
