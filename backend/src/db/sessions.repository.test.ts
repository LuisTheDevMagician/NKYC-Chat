import { describe, expect, it } from "bun:test";
import { createDb } from "./client";
import { createUsersRepository } from "./users.repository";
import { createSessionsRepository } from "./sessions.repository";
import { testUserInput } from "./test-helpers";

function setup() {
  const database = createDb(":memory:");
  const users = createUsersRepository(database);
  const sessions = createSessionsRepository(database);
  const user = users.create(testUserInput("alice", "salt", "hash"));
  return { sessions, user };
}

describe("sessions repository", () => {
  it("creates and finds a session by token", () => {
    const { sessions, user } = setup();
    sessions.create("token-abc", user.id, Date.now() + 1000);

    const found = sessions.findByToken("token-abc");
    expect(found?.userId).toBe(user.id);
  });

  it("returns null for unknown token", () => {
    const { sessions } = setup();
    expect(sessions.findByToken("nope")).toBeNull();
  });

  it("deletes a session by token", () => {
    const { sessions, user } = setup();
    sessions.create("token-xyz", user.id, Date.now() + 1000);
    sessions.deleteByToken("token-xyz");
    expect(sessions.findByToken("token-xyz")).toBeNull();
  });
});
