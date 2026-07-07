import { describe, expect, it } from "bun:test";
import { createDb } from "./client";
import { createUsersRepository, type CreateUserInput } from "./users.repository";

function setup() {
  const database = createDb(":memory:");
  return createUsersRepository(database);
}

function input(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
  return {
    username: "alice",
    salt: "salt123",
    passwordHash: "hash123",
    publicKey: "pub-key",
    wrappedPrivateKey: "wrapped-key",
    wrapIv: "wrap-iv",
    keySalt: "key-salt",
    ...overrides,
  };
}

describe("users repository", () => {
  it("creates a user and finds it by username", () => {
    const repo = setup();
    repo.create(input());

    const found = repo.findByUsername("alice");
    expect(found?.username).toBe("alice");
    expect(found?.salt).toBe("salt123");
    expect(found?.passwordHash).toBe("hash123");
    expect(found?.publicKey).toBe("pub-key");
    expect(found?.wrappedPrivateKey).toBe("wrapped-key");
    expect(found?.wrapIv).toBe("wrap-iv");
    expect(found?.keySalt).toBe("key-salt");
  });

  it("returns null for unknown username", () => {
    const repo = setup();
    expect(repo.findByUsername("nobody")).toBeNull();
  });

  it("finds a user by id", () => {
    const repo = setup();
    const created = repo.create(input({ username: "bob" }));
    const found = repo.findById(created.id);
    expect(found?.username).toBe("bob");
  });
});
