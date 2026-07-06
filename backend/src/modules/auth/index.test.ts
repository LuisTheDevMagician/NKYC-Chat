import { describe, expect, it } from "bun:test";
import { authModule } from "./index";

function extractCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/session=([^;]+)/);
  return match ? `session=${match[1]}` : "";
}

describe("auth module", () => {
  it("registers, logs in, reads /me, and logs out", async () => {
    const registerRes = await authModule.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice", password: "password123" }),
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
        body: JSON.stringify({ username: "bob", password: "password123" }),
      })
    );
    const res = await authModule.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "bob", password: "password123" }),
      })
    );
    expect(res.status).toBe(409);
  });
});
