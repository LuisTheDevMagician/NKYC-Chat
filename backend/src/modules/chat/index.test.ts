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
  return { token: extractCookie(loginRes), user };
}

describe("chat gateway", () => {
  it("broadcasts presence when a client says hello", async () => {
    const alice = await registerAndLogin("alice-ws");

    const ws = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { cookie: `session=${alice.token}` },
    } as never);

    const presenceEvent = await new Promise<{ type: string; users: unknown[] }>((resolve) => {
      ws.onopen = () => ws.send(JSON.stringify({ type: "hello", publicKey: "alice-pk" }));
      ws.onmessage = (event) => resolve(JSON.parse(event.data as string));
    });

    expect(presenceEvent.type).toBe("presence");
    expect(presenceEvent.users).toHaveLength(1);
    ws.close();
  });
});
