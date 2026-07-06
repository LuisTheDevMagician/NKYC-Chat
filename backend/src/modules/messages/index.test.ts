import { describe, expect, it } from "bun:test";
import { authModule } from "../auth/index";
import { messagesModule } from "./index";
import { db } from "../../db/client";
import { createMessagesRepository } from "../../db/messages.repository";

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
      body: JSON.stringify({ username, password: "password123" }),
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

describe("messages module", () => {
  it("returns the conversation history between two users", async () => {
    const alice = await registerAndLogin("alice-msg");
    const bob = await registerAndLogin("bob-msg");

    const messagesRepository = createMessagesRepository(db);
    messagesRepository.create({
      fromUserId: alice.user.id,
      toUserId: bob.user.id,
      ciphertext: "c1",
      encryptedAesKey: "k1",
      iv: "iv1",
    });

    const res = await messagesModule.handle(
      new Request(`http://localhost/messages/${bob.user.id}`, {
        headers: { cookie: alice.cookie },
      })
    );
    expect(res.status).toBe(200);
    const history = await res.json();
    expect(history).toHaveLength(1);
    expect(history[0].ciphertext).toBe("c1");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await messagesModule.handle(new Request("http://localhost/messages/1"));
    expect(res.status).toBe(401);
  });
});
