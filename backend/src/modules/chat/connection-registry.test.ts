import { describe, expect, it } from "bun:test";
import { createConnectionRegistry, type Connection } from "./connection-registry";

function fakeConnection(userId: number): Connection {
  return { userId, username: `user-${userId}`, publicKey: `pk-${userId}`, send: () => {} };
}

describe("connection registry", () => {
  it("adds and retrieves a connection by userId", () => {
    const registry = createConnectionRegistry();
    registry.add(fakeConnection(1));
    expect(registry.get(1)?.username).toBe("user-1");
  });

  it("removes a connection", () => {
    const registry = createConnectionRegistry();
    registry.add(fakeConnection(1));
    registry.remove(1);
    expect(registry.get(1)).toBeUndefined();
  });

  it("lists all connections", () => {
    const registry = createConnectionRegistry();
    registry.add(fakeConnection(1));
    registry.add(fakeConnection(2));
    expect(registry.list()).toHaveLength(2);
  });
});
