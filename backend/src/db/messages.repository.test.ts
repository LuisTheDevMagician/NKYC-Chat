import { describe, expect, it } from "bun:test";
import { createDb } from "./client";
import { createUsersRepository } from "./users.repository";
import { createMessagesRepository } from "./messages.repository";
import { createConversationsRepository } from "./conversations.repository";
import { testUserInput } from "./test-helpers";

function setup() {
  const database = createDb(":memory:");
  const users = createUsersRepository(database);
  const messages = createMessagesRepository(database);
  const conversations = createConversationsRepository(database);
  const alice = users.create(testUserInput("alice"));
  const bob = users.create(testUserInput("bob"));
  return { messages, conversations, users, alice, bob };
}

describe("messages repository", () => {
  it("stores a message and retrieves the conversation in order", () => {
    const { messages, conversations, alice, bob } = setup();
    const conversation = conversations.getOrCreateActive1to1(alice.id, bob.id);
    messages.create({
      conversationId: conversation.id,
      fromUserId: alice.id,
      ciphertext: "c1",
      iv: "iv1",
      recipientKeys: [
        { userId: bob.id, encryptedAesKey: "k1" },
        { userId: alice.id, encryptedAesKey: "sk1" },
      ],
    });
    messages.create({
      conversationId: conversation.id,
      fromUserId: bob.id,
      ciphertext: "c2",
      iv: "iv2",
      recipientKeys: [
        { userId: alice.id, encryptedAesKey: "k2" },
        { userId: bob.id, encryptedAesKey: "sk2" },
      ],
    });

    const found = messages.findByConversationIdForUser(conversation.id, alice.id);
    expect(found).toHaveLength(2);
    expect(found[0].ciphertext).toBe("c1");
    expect(found[0].encryptedAesKey).toBe("sk1");
    expect(found[1].ciphertext).toBe("c2");
    expect(found[1].encryptedAesKey).toBe("k2");
  });

  it("does not include messages from unrelated conversations", () => {
    const { messages, conversations, users, alice, bob } = setup();
    const carol = users.create(testUserInput("carol"));

    const aliceBob = conversations.getOrCreateActive1to1(alice.id, bob.id);
    conversations.getOrCreateActive1to1(alice.id, carol.id);

    messages.create({
      conversationId: aliceBob.id,
      fromUserId: alice.id,
      ciphertext: "c1",
      iv: "iv1",
      recipientKeys: [{ userId: bob.id, encryptedAesKey: "k1" }],
    });

    const aliceCarol = conversations.getOrCreateActive1to1(alice.id, carol.id);
    expect(messages.findByConversationIdForUser(aliceCarol.id, alice.id)).toHaveLength(0);
  });

  it("returns a null key for a user with no stored copy of the AES key", () => {
    const { messages, conversations, alice, bob } = setup();
    const conversation = conversations.getOrCreateActive1to1(alice.id, bob.id);
    messages.create({
      conversationId: conversation.id,
      fromUserId: alice.id,
      ciphertext: "c1",
      iv: "iv1",
      recipientKeys: [{ userId: bob.id, encryptedAesKey: "k1" }],
    });

    const found = messages.findByConversationIdForUser(conversation.id, alice.id);
    expect(found[0].encryptedAesKey).toBeNull();
  });
});
