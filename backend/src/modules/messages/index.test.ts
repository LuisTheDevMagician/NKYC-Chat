import { describe, expect, it } from "bun:test";
import { authModule } from "../auth/index";
import { messagesModule } from "./index";
import { db } from "../../db/client";
import { createMessagesRepository } from "../../db/messages.repository";
import { createConversationsRepository } from "../../db/conversations.repository";

function extractCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/session=([^;]+)/);
  return match ? `session=${match[1]}` : "";
}

async function registerAndLogin(username: string) {
  await authModule.handle(
    new Request("http://localhost/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password: "password123",
        publicKey: "pub-key",
        wrappedPrivateKey: "wrapped-key",
        wrapIv: "wrap-iv",
        keySalt: "key-salt",
      }),
    })
  );
  const loginRes = await authModule.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "password123" }),
    })
  );
  const user = await loginRes.json();
  return { cookie: extractCookie(loginRes), user };
}

describe("messages module — 1:1", () => {
  it("returns the messages for the active conversation between two users", async () => {
    const alice = await registerAndLogin("alice-msg");
    const bob = await registerAndLogin("bob-msg");

    const messagesRepository = createMessagesRepository(db);
    const conversationsRepository = createConversationsRepository(db);
    const conversation = conversationsRepository.getOrCreateActive1to1(alice.user.id, bob.user.id);
    messagesRepository.create({
      conversationId: conversation.id,
      fromUserId: alice.user.id,
      ciphertext: "c1",
      iv: "iv1",
      recipientKeys: [
        { userId: bob.user.id, encryptedAesKey: "k1" },
        { userId: alice.user.id, encryptedAesKey: "sk1" },
      ],
    });

    const res = await messagesModule.handle(
      new Request(`http://localhost/messages/active/${bob.user.id}`, {
        headers: { cookie: alice.cookie },
      })
    );
    expect(res.status).toBe(200);
    const active = await res.json();
    expect(active).toHaveLength(1);
    expect(active[0].ciphertext).toBe("c1");
    expect(active[0].encryptedAesKey).toBe("sk1");
  });

  it("returns an empty array when there is no active conversation", async () => {
    const alice = await registerAndLogin("alice-msg-2");
    const bob = await registerAndLogin("bob-msg-2");

    const res = await messagesModule.handle(
      new Request(`http://localhost/messages/active/${bob.user.id}`, {
        headers: { cookie: alice.cookie },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("lists ended conversations in the history endpoint", async () => {
    const alice = await registerAndLogin("alice-msg-3");
    const bob = await registerAndLogin("bob-msg-3");

    const conversationsRepository = createConversationsRepository(db);
    conversationsRepository.getOrCreateActive1to1(alice.user.id, bob.user.id);
    conversationsRepository.endAllActiveForUser(alice.user.id);

    const res = await messagesModule.handle(
      new Request("http://localhost/messages/history", {
        headers: { cookie: alice.cookie },
      })
    );
    expect(res.status).toBe(200);
    const history = await res.json();
    expect(history).toHaveLength(1);
    expect(history[0].title).toBe("bob-msg-3");
    expect(history[0].isGroup).toBe(false);
  });

  it("returns the full message thread for a specific ended conversation", async () => {
    const alice = await registerAndLogin("alice-msg-4");
    const bob = await registerAndLogin("bob-msg-4");

    const messagesRepository = createMessagesRepository(db);
    const conversationsRepository = createConversationsRepository(db);
    const conversation = conversationsRepository.getOrCreateActive1to1(alice.user.id, bob.user.id);
    messagesRepository.create({
      conversationId: conversation.id,
      fromUserId: alice.user.id,
      ciphertext: "c1",
      iv: "iv1",
      recipientKeys: [
        { userId: bob.user.id, encryptedAesKey: "k1" },
        { userId: alice.user.id, encryptedAesKey: "sk1" },
      ],
    });
    conversationsRepository.endAllActiveForUser(alice.user.id);

    const res = await messagesModule.handle(
      new Request(`http://localhost/messages/history/${conversation.id}`, {
        headers: { cookie: alice.cookie },
      })
    );
    expect(res.status).toBe(200);
    const thread = await res.json();
    expect(thread).toHaveLength(1);
    expect(thread[0].ciphertext).toBe("c1");
  });

  it("rejects fetching another user's conversation history", async () => {
    const alice = await registerAndLogin("alice-msg-5");
    const bob = await registerAndLogin("bob-msg-5");
    const mallory = await registerAndLogin("mallory-msg-5");

    const conversationsRepository = createConversationsRepository(db);
    const conversation = conversationsRepository.getOrCreateActive1to1(alice.user.id, bob.user.id);
    conversationsRepository.endAllActiveForUser(alice.user.id);

    const res = await messagesModule.handle(
      new Request(`http://localhost/messages/history/${conversation.id}`, {
        headers: { cookie: mallory.cookie },
      })
    );
    expect(res.status).toBe(404);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await messagesModule.handle(new Request("http://localhost/messages/history"));
    expect(res.status).toBe(401);
  });
});

describe("messages module — groups", () => {
  it("lists active groups and returns their messages to accepted participants", async () => {
    const alice = await registerAndLogin("alice-grp");
    const bob = await registerAndLogin("bob-grp");
    const mallory = await registerAndLogin("mallory-grp");

    const messagesRepository = createMessagesRepository(db);
    const conversationsRepository = createConversationsRepository(db);
    const group = conversationsRepository.createGroup(alice.user.id, [bob.user.id], "Amigos");
    conversationsRepository.respondToInvite(group.id, bob.user.id, "accepted");
    messagesRepository.create({
      conversationId: group.id,
      fromUserId: alice.user.id,
      ciphertext: "c1",
      iv: "iv1",
      recipientKeys: [
        { userId: alice.user.id, encryptedAesKey: "k-alice" },
        { userId: bob.user.id, encryptedAesKey: "k-bob" },
      ],
    });

    const groupsRes = await messagesModule.handle(
      new Request("http://localhost/messages/groups", { headers: { cookie: bob.cookie } })
    );
    expect(groupsRes.status).toBe(200);
    const groups = await groupsRes.json();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Amigos");

    const messagesRes = await messagesModule.handle(
      new Request(`http://localhost/messages/group/${group.id}`, { headers: { cookie: bob.cookie } })
    );
    expect(messagesRes.status).toBe(200);
    const messages = await messagesRes.json();
    expect(messages[0].encryptedAesKey).toBe("k-bob");

    const malloryRes = await messagesModule.handle(
      new Request(`http://localhost/messages/group/${group.id}`, { headers: { cookie: mallory.cookie } })
    );
    expect(malloryRes.status).toBe(404);
  });

  it("returns participants (with isGroup) so the history view can label senders", async () => {
    const alice = await registerAndLogin("alice-parts");
    const bob = await registerAndLogin("bob-parts");
    const mallory = await registerAndLogin("mallory-parts");

    const conversationsRepository = createConversationsRepository(db);
    const group = conversationsRepository.createGroup(alice.user.id, [bob.user.id], "Amigos");
    conversationsRepository.respondToInvite(group.id, bob.user.id, "accepted");

    const res = await messagesModule.handle(
      new Request(`http://localhost/messages/participants/${group.id}`, { headers: { cookie: bob.cookie } })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isGroup).toBe(true);
    expect(body.participants.map((p: { username: string }) => p.username).sort()).toEqual([
      "alice-parts",
      "bob-parts",
    ]);

    const malloryRes = await messagesModule.handle(
      new Request(`http://localhost/messages/participants/${group.id}`, { headers: { cookie: mallory.cookie } })
    );
    expect(malloryRes.status).toBe(404);
  });
});
