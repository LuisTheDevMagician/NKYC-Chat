import { describe, expect, it } from "bun:test";
import { createDb } from "./client";
import { createUsersRepository } from "./users.repository";

function setup() {
  const database = createDb(":memory:");
  return createUsersRepository(database);
}

describe("users repository", () => {
  it("creates a user and finds it by username", () => {
    const repo = setup();
    repo.create("alice", "salt123", "hash123");

    const found = repo.findByUsername("alice");
    expect(found?.username).toBe("alice");
    expect(found?.salt).toBe("salt123");
    expect(found?.passwordHash).toBe("hash123");
  });

  it("returns null for unknown username", () => {
    const repo = setup();
    expect(repo.findByUsername("nobody")).toBeNull();
  });

  it("finds a user by id", () => {
    const repo = setup();
    const created = repo.create("bob", "salt", "hash");
    const found = repo.findById(created.id);
    expect(found?.username).toBe("bob");
  });
});
