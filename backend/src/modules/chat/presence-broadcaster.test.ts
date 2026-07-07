import { describe, expect, it } from "bun:test";
import { createConnectionRegistry, type Connection } from "./connection-registry";
import { broadcastPresence } from "./presence-broadcaster";
import type { ServerEvent } from "./model";

function fakeConnection(userId: number, received: ServerEvent[]): Connection {
  return {
    userId,
    username: `user-${userId}`,
    publicKey: `pk-${userId}`,
    send: (event) => received.push(event as ServerEvent),
  };
}

describe("broadcastPresence", () => {
  it("never lists a connection as online to itself", () => {
    const registry = createConnectionRegistry();
    const aliceReceived: ServerEvent[] = [];
    const bobReceived: ServerEvent[] = [];
    registry.add(fakeConnection(1, aliceReceived));
    registry.add(fakeConnection(2, bobReceived));

    broadcastPresence(registry);

    const aliceEvent = aliceReceived[0] as Extract<ServerEvent, { type: "presence" }>;
    const bobEvent = bobReceived[0] as Extract<ServerEvent, { type: "presence" }>;

    expect(aliceEvent.users.map((u) => u.id)).toEqual([2]);
    expect(bobEvent.users.map((u) => u.id)).toEqual([1]);
  });
});
