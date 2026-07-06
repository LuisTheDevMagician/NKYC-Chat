import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { applySchema } from "./schema";

describe("applySchema", () => {
  it("creates users, sessions, and messages tables", () => {
    const database = new Database(":memory:");
    applySchema(database);

    const tables = database
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all() as { name: string }[];

    expect(tables.map((t) => t.name)).toEqual(["messages", "sessions", "users"]);
  });
});
