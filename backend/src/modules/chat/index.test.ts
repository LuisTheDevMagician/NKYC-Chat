import { describe, expect, it, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { authModule } from "../auth/index";
import { chatModule } from "./index";

const app = new Elysia().use(authModule).use(chatModule).listen(0);
const port = (app.server?.port ?? 0) as number;

afterAll(() => {
  app.stop();
});

function extractCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/session=([^;]+)/);
  return match ? match[1] : "";
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  while (!predicate()) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
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
  return { token: extractCookie(loginRes), user };
}

describe("chat gateway", () => {
  it("broadcasts presence when a client says hello, without listing the client itself", async () => {
    const alice = await registerAndLogin("alice-ws");

    const ws = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { cookie: `session=${alice.token}` },
    } as never);

    const presenceEvent = await new Promise<{ type: string; users: unknown[] }>((resolve) => {
      ws.onopen = () => ws.send(JSON.stringify({ type: "hello", publicKey: "alice-pk" }));
      ws.onmessage = (event) => resolve(JSON.parse(event.data as string));
    });

    expect(presenceEvent.type).toBe("presence");
    expect(presenceEvent.users).toHaveLength(0);
    ws.close();
  });

  it("lists other connected users but never the recipient's own connection", async () => {
    const alice = await registerAndLogin("alice-ws-2");
    const bob = await registerAndLogin("bob-ws-2");

    const aliceMessages: { users: { id: number }[] }[] = [];
    const aliceWs = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { cookie: `session=${alice.token}` },
    } as never);
    aliceWs.addEventListener("message", (event) => {
      aliceMessages.push(JSON.parse(event.data as string));
    });
    await new Promise<void>((resolve) => {
      aliceWs.onopen = () => {
        aliceWs.send(JSON.stringify({ type: "hello", publicKey: "alice-pk" }));
        resolve();
      };
    });

    // alice's own hello triggers a presence broadcast to herself (empty, she's alone) —
    // wait for it before bob connects, so it can't be mistaken for the later update.
    await waitUntil(() => aliceMessages.length >= 1);
    expect(aliceMessages[0].users).toHaveLength(0);

    const bobMessages: { users: { id: number }[] }[] = [];
    const bobWs = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { cookie: `session=${bob.token}` },
    } as never);
    bobWs.addEventListener("message", (event) => {
      bobMessages.push(JSON.parse(event.data as string));
    });
    await new Promise<void>((resolve) => {
      bobWs.onopen = () => {
        bobWs.send(JSON.stringify({ type: "hello", publicKey: "bob-pk" }));
        resolve();
      };
    });

    await waitUntil(() => aliceMessages.length >= 2 && bobMessages.length >= 1);

    expect(aliceMessages[1].users.map((u) => u.id)).toEqual([bob.user.id]);
    expect(bobMessages[0].users.map((u) => u.id)).toEqual([alice.user.id]);

    aliceWs.close();
    bobWs.close();
  });
});
