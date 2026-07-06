import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { createDb } from "./client";

describe("createDb", () => {
  it("applies migrations creating users, sessions, and messages tables", () => {
    const database = createDb(":memory:");
    const tables = database.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name`
    );
    expect(tables.map((t) => t.name)).toEqual(["messages", "sessions", "users"]);
  });
});
