import { describe, expect, it } from "bun:test";
import { authModule } from "./index";

function extractCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/session=([^;]+)/);
  return match ? `session=${match[1]}` : "";
}

function registerBody(username: string) {
  return JSON.stringify({
    username,
    password: "password123",
    publicKey: "pub-key",
    wrappedPrivateKey: "wrapped-key",
    wrapIv: "wrap-iv",
    keySalt: "key-salt",
  });
}

describe("auth module", () => {
  it("registers, logs in, reads /me, and logs out", async () => {
    const registerRes = await authModule.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: registerBody("alice"),
      })
    );
    expect(registerRes.status).toBe(200);

    const loginRes = await authModule.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice", password: "password123" }),
      })
    );
    expect(loginRes.status).toBe(200);
    const cookie = extractCookie(loginRes);
    expect(cookie).toContain("session=");
    const loginBody = await loginRes.json();
    expect(loginBody.publicKey).toBe("pub-key");
    expect(loginBody.wrappedPrivateKey).toBe("wrapped-key");
    expect(loginBody.wrapIv).toBe("wrap-iv");
    expect(loginBody.keySalt).toBe("key-salt");

    const meRes = await authModule.handle(
      new Request("http://localhost/auth/me", {
        headers: { cookie },
      })
    );
    expect(meRes.status).toBe(200);
    const me = await meRes.json();
    expect(me.username).toBe("alice");

    const logoutRes = await authModule.handle(
      new Request("http://localhost/auth/logout", {
        method: "POST",
        headers: { cookie },
      })
    );
    expect(logoutRes.status).toBe(200);
  });

  it("rejects /me without a session", async () => {
    const res = await authModule.handle(new Request("http://localhost/auth/me"));
    expect(res.status).toBe(401);
  });

  it("rejects duplicate registration with 409", async () => {
    await authModule.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: registerBody("bob"),
      })
    );
    const res = await authModule.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: registerBody("bob"),
      })
    );
    expect(res.status).toBe(409);
  });
});
