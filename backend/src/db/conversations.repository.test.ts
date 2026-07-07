import { describe, expect, it } from "bun:test";
import { createDb } from "./client";
import { createUsersRepository } from "./users.repository";
import { createConversationsRepository } from "./conversations.repository";
import { testUserInput } from "./test-helpers";

function setup() {
  const database = createDb(":memory:");
  const users = createUsersRepository(database);
  const conversations = createConversationsRepository(database);
  const alice = users.create(testUserInput("alice"));
  const bob = users.create(testUserInput("bob"));
  const carol = users.create(testUserInput("carol"));
  return { conversations, alice, bob, carol };
}

describe("conversations repository", () => {
  it("creates a new active conversation when none exists", () => {
    const { conversations, alice, bob } = setup();
    expect(conversations.findActive(alice.id, bob.id)).toBeUndefined();

    const created = conversations.getOrCreateActive(alice.id, bob.id);
    expect(created.endedAt).toBeNull();
    expect(conversations.findActive(alice.id, bob.id)?.id).toBe(created.id);
  });

  it("reuses the same active conversation regardless of argument order", () => {
    const { conversations, alice, bob } = setup();
    const first = conversations.getOrCreateActive(alice.id, bob.id);
    const second = conversations.getOrCreateActive(bob.id, alice.id);
    expect(second.id).toBe(first.id);
  });

  it("ends every active conversation for a user, without touching unrelated ones", () => {
    const { conversations, alice, bob, carol } = setup();
    const aliceBob = conversations.getOrCreateActive(alice.id, bob.id);
    conversations.getOrCreateActive(bob.id, carol.id);

    conversations.endAllActiveForUser(alice.id);

    expect(conversations.findById(aliceBob.id)?.endedAt).not.toBeNull();
    expect(conversations.findActive(bob.id, carol.id)).toBeDefined();
  });

  it("lists only ended conversations for a user, most recently ended first", async () => {
    const { conversations, alice, bob, carol } = setup();
    const aliceBob = conversations.getOrCreateActive(alice.id, bob.id);
    conversations.endAllActiveForUser(alice.id);

    await new Promise((resolve) => setTimeout(resolve, 5));
    conversations.getOrCreateActive(alice.id, carol.id);
    conversations.endAllActiveForUser(alice.id);

    const history = conversations.findHistoryForUser(alice.id);
    expect(history).toHaveLength(2);
    expect(history[0].peerUsername).toBe("carol");
    expect(history[1].peerUsername).toBe("bob");
    expect(history.map((h) => h.id)).toContain(aliceBob.id);
  });

  it("does not list still-active conversations in history", () => {
    const { conversations, alice, bob } = setup();
    conversations.getOrCreateActive(alice.id, bob.id);
    expect(conversations.findHistoryForUser(alice.id)).toHaveLength(0);
  });
});
