import { describe, expect, it } from "bun:test";
import { createDb } from "../../db/client";
import { createUsersRepository } from "../../db/users.repository";
import { createSessionsRepository } from "../../db/sessions.repository";
import { testUserInput } from "../../db/test-helpers";
import { createSession, validateSession } from "./session";

function setup() {
  const database = createDb(":memory:");
  const users = createUsersRepository(database);
  const sessions = createSessionsRepository(database);
  const user = users.create(testUserInput("alice"));
  return { sessions, user };
}

describe("session", () => {
  it("creates a session that validates successfully", () => {
    const { sessions, user } = setup();
    const session = createSession(sessions, user.id);
    const validated = validateSession(sessions, session.token);
    expect(validated?.userId).toBe(user.id);
  });

  it("returns null for an unknown token", () => {
    const { sessions } = setup();
    expect(validateSession(sessions, "unknown-token")).toBeNull();
  });

  it("returns null and deletes an expired session", () => {
    const { sessions, user } = setup();
    sessions.create("expired-token", user.id, Date.now() - 1000);
    expect(validateSession(sessions, "expired-token")).toBeNull();
    expect(sessions.findByToken("expired-token")).toBeNull();
  });
});
