import { describe, expect, it } from "bun:test";
import { createDb } from "../../db/client";
import { createUsersRepository } from "../../db/users.repository";
import { createSessionsRepository } from "../../db/sessions.repository";
import { AuthService, AuthError } from "./service";

function setup() {
  const database = createDb(":memory:");
  return {
    users: createUsersRepository(database),
    sessions: createSessionsRepository(database),
  };
}

describe("AuthService", () => {
  it("registers a new user", async () => {
    const { users } = setup();
    const user = await AuthService.register(users, "alice", "password123");
    expect(user.username).toBe("alice");
    expect(user.id).toBeGreaterThan(0);
  });

  it("rejects registering a duplicate username", async () => {
    const { users } = setup();
    await AuthService.register(users, "alice", "password123");
    await expect(AuthService.register(users, "alice", "other-password")).rejects.toThrow(
      AuthError
    );
  });

  it("logs in with correct credentials and returns a session token", async () => {
    const { users, sessions } = setup();
    await AuthService.register(users, "alice", "password123");
    const { user, token } = await AuthService.login(users, sessions, "alice", "password123");
    expect(user.username).toBe("alice");
    expect(token).toBeTruthy();
  });

  it("rejects login with wrong password", async () => {
    const { users, sessions } = setup();
    await AuthService.register(users, "alice", "password123");
    await expect(
      AuthService.login(users, sessions, "alice", "wrong-password")
    ).rejects.toThrow(AuthError);
  });
});
