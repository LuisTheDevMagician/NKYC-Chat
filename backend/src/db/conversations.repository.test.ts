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

describe("conversations repository — 1:1", () => {
  it("creates a new active conversation when none exists", () => {
    const { conversations, alice, bob } = setup();
    expect(conversations.findActive1to1(alice.id, bob.id)).toBeUndefined();

    const created = conversations.getOrCreateActive1to1(alice.id, bob.id);
    expect(created.endedAt).toBeNull();
    expect(created.isGroup).toBe(false);
    expect(conversations.findActive1to1(alice.id, bob.id)?.id).toBe(created.id);
  });

  it("reuses the same active conversation regardless of argument order", () => {
    const { conversations, alice, bob } = setup();
    const first = conversations.getOrCreateActive1to1(alice.id, bob.id);
    const second = conversations.getOrCreateActive1to1(bob.id, alice.id);
    expect(second.id).toBe(first.id);
  });

  it("both participants are accepted immediately", () => {
    const { conversations, alice, bob } = setup();
    const conversation = conversations.getOrCreateActive1to1(alice.id, bob.id);
    const participants = conversations.findParticipants(conversation.id);
    expect(participants.every((p) => p.status === "accepted")).toBe(true);
  });
});

describe("conversations repository — groups", () => {
  it("creates a group with the creator accepted and others invited", () => {
    const { conversations, alice, bob, carol } = setup();
    const group = conversations.createGroup(alice.id, [bob.id, carol.id], "Amigos");
    expect(group.isGroup).toBe(true);
    expect(group.name).toBe("Amigos");

    const participants = conversations.findParticipants(group.id);
    expect(participants.find((p) => p.userId === alice.id)?.status).toBe("accepted");
    expect(participants.find((p) => p.userId === bob.id)?.status).toBe("invited");
    expect(participants.find((p) => p.userId === carol.id)?.status).toBe("invited");
  });

  it("stays active when a member accepts", () => {
    const { conversations, alice, bob, carol } = setup();
    const group = conversations.createGroup(alice.id, [bob.id, carol.id], null);
    conversations.respondToInvite(group.id, bob.id, "accepted");

    expect(conversations.findById(group.id)?.endedAt).toBeNull();
    expect(conversations.findAcceptedParticipantIds(group.id).sort()).toEqual([alice.id, bob.id].sort());
  });

  it("stays active when one declines but another already accepted", () => {
    const { conversations, alice, bob, carol } = setup();
    const group = conversations.createGroup(alice.id, [bob.id, carol.id], null);
    conversations.respondToInvite(group.id, bob.id, "accepted");
    conversations.respondToInvite(group.id, carol.id, "declined");

    expect(conversations.findById(group.id)?.endedAt).toBeNull();
  });

  it("ends automatically when everyone has responded with fewer than 2 accepted", () => {
    const { conversations, alice, bob, carol } = setup();
    const group = conversations.createGroup(alice.id, [bob.id, carol.id], null);
    conversations.respondToInvite(group.id, bob.id, "declined");
    conversations.respondToInvite(group.id, carol.id, "declined");

    expect(conversations.findById(group.id)?.endedAt).not.toBeNull();
  });

  it("lists active groups for a user with member usernames", () => {
    const { conversations, alice, bob, carol } = setup();
    const group = conversations.createGroup(alice.id, [bob.id, carol.id], "Amigos");
    conversations.respondToInvite(group.id, bob.id, "accepted");

    const activeGroups = conversations.findActiveGroupsForUser(alice.id);
    expect(activeGroups).toHaveLength(1);
    expect(activeGroups[0].name).toBe("Amigos");
    expect(activeGroups[0].members.map((m) => m.username).sort()).toEqual(["alice", "bob"].sort());
    expect(activeGroups[0].members.map((m) => m.id).sort()).toEqual([alice.id, bob.id].sort());
  });
});

describe("conversations repository — disconnect lifecycle", () => {
  it("ends every active conversation for a user, without touching unrelated ones", () => {
    const { conversations, alice, bob, carol } = setup();
    const aliceBob = conversations.getOrCreateActive1to1(alice.id, bob.id);
    conversations.getOrCreateActive1to1(bob.id, carol.id);

    conversations.endAllActiveForUser(alice.id);

    expect(conversations.findById(aliceBob.id)?.endedAt).not.toBeNull();
    expect(conversations.findActive1to1(bob.id, carol.id)).toBeDefined();
  });

  it("auto-declines pending invites for a user who disconnects", () => {
    const { conversations, alice, bob, carol } = setup();
    const group = conversations.createGroup(alice.id, [bob.id, carol.id], null);

    conversations.declineAllPendingForUser(bob.id);

    const participants = conversations.findParticipants(group.id);
    expect(participants.find((p) => p.userId === bob.id)?.status).toBe("declined");
  });

  it("ends the group once the disconnecting decline leaves fewer than 2 accepted", () => {
    const { conversations, alice, bob, carol } = setup();
    const group = conversations.createGroup(alice.id, [bob.id, carol.id], null);
    conversations.respondToInvite(group.id, carol.id, "declined");

    conversations.declineAllPendingForUser(bob.id);

    expect(conversations.findById(group.id)?.endedAt).not.toBeNull();
  });
});

describe("conversations repository — history", () => {
  it("lists only ended conversations for a user, most recently ended first", async () => {
    const { conversations, alice, bob, carol } = setup();
    const aliceBob = conversations.getOrCreateActive1to1(alice.id, bob.id);
    conversations.endAllActiveForUser(alice.id);

    await new Promise((resolve) => setTimeout(resolve, 5));
    conversations.getOrCreateActive1to1(alice.id, carol.id);
    conversations.endAllActiveForUser(alice.id);

    const history = conversations.findHistoryForUser(alice.id);
    expect(history).toHaveLength(2);
    expect(history[0].title).toBe("carol");
    expect(history[1].title).toBe("bob");
    expect(history.map((h) => h.id)).toContain(aliceBob.id);
  });

  it("does not list still-active conversations in history", () => {
    const { conversations, alice, bob } = setup();
    conversations.getOrCreateActive1to1(alice.id, bob.id);
    expect(conversations.findHistoryForUser(alice.id)).toHaveLength(0);
  });

  it("shows the group name (or generated one) as the history title", async () => {
    const { conversations, alice, bob } = setup();
    const named = conversations.createGroup(alice.id, [bob.id], "Amigos");
    conversations.respondToInvite(named.id, bob.id, "accepted");
    conversations.endAllActiveForUser(alice.id);

    const history = conversations.findHistoryForUser(alice.id);
    expect(history[0].title).toBe("Amigos");
    expect(history[0].isGroup).toBe(true);
  });
});
