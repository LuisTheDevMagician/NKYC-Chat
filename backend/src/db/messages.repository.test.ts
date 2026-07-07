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
    const conversation = conversations.getOrCreateActive(alice.id, bob.id);
    messages.create({
      conversationId: conversation.id,
      fromUserId: alice.id,
      toUserId: bob.id,
      ciphertext: "c1",
      encryptedAesKey: "k1",
      encryptedAesKeyForSender: "sk1",
      iv: "iv1",
    });
    messages.create({
      conversationId: conversation.id,
      fromUserId: bob.id,
      toUserId: alice.id,
      ciphertext: "c2",
      encryptedAesKey: "k2",
      encryptedAesKeyForSender: "sk2",
      iv: "iv2",
    });

    const found = messages.findByConversationId(conversation.id);
    expect(found).toHaveLength(2);
    expect(found[0].ciphertext).toBe("c1");
    expect(found[1].ciphertext).toBe("c2");
  });

  it("does not include messages from unrelated conversations", () => {
    const { messages, conversations, users, alice, bob } = setup();
    const carol = users.create(testUserInput("carol"));

    const aliceBob = conversations.getOrCreateActive(alice.id, bob.id);
    conversations.getOrCreateActive(alice.id, carol.id);

    messages.create({
      conversationId: aliceBob.id,
      fromUserId: alice.id,
      toUserId: bob.id,
      ciphertext: "c1",
      encryptedAesKey: "k1",
      encryptedAesKeyForSender: "sk1",
      iv: "iv1",
    });

    const aliceCarol = conversations.getOrCreateActive(alice.id, carol.id);
    expect(messages.findByConversationId(aliceCarol.id)).toHaveLength(0);
  });
});
