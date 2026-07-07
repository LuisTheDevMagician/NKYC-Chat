import { describe, expect, it } from "bun:test";
import { createDb } from "../../db/client";
import { createUsersRepository } from "../../db/users.repository";
import { createSessionsRepository } from "../../db/sessions.repository";
import { AuthService, AuthError, type KeyMaterial } from "./service";

function setup() {
  const database = createDb(":memory:");
  return {
    users: createUsersRepository(database),
    sessions: createSessionsRepository(database),
  };
}

const keyMaterial: KeyMaterial = {
  publicKey: "pub-key",
  wrappedPrivateKey: "wrapped-key",
  wrapIv: "wrap-iv",
  keySalt: "key-salt",
};

describe("AuthService", () => {
  it("registers a new user", async () => {
    const { users } = setup();
    const user = await AuthService.register(users, "alice", "password123", keyMaterial);
    expect(user.username).toBe("alice");
    expect(user.id).toBeGreaterThan(0);
  });

  it("rejects registering a duplicate username", async () => {
    const { users } = setup();
    await AuthService.register(users, "alice", "password123", keyMaterial);
    await expect(
      AuthService.register(users, "alice", "other-password", keyMaterial)
    ).rejects.toThrow(AuthError);
  });

  it("logs in with correct credentials and returns the wrapped key material", async () => {
    const { users, sessions } = setup();
    await AuthService.register(users, "alice", "password123", keyMaterial);
    const { user, token } = await AuthService.login(users, sessions, "alice", "password123");
    expect(user.username).toBe("alice");
    expect(user.publicKey).toBe("pub-key");
    expect(user.wrappedPrivateKey).toBe("wrapped-key");
    expect(user.wrapIv).toBe("wrap-iv");
    expect(user.keySalt).toBe("key-salt");
    expect(token).toBeTruthy();
  });

  it("rejects login with wrong password", async () => {
    const { users, sessions } = setup();
    await AuthService.register(users, "alice", "password123", keyMaterial);
    await expect(
      AuthService.login(users, sessions, "alice", "wrong-password")
    ).rejects.toThrow(AuthError);
  });
});
