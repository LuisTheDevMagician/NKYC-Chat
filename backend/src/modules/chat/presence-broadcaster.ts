import type { ConnectionRegistry } from "./connection-registry";
import type { ServerEvent } from "./model";

export function broadcastPresence(registry: ConnectionRegistry): void {
  const users = registry
    .list()
    .map((c) => ({ id: c.userId, username: c.username, publicKey: c.publicKey }));
  const event: ServerEvent = { type: "presence", users };
  for (const connection of registry.list()) {
    connection.send(event);
  }
}

export function broadcastTyping(registry: ConnectionRegistry, from: number, to: number): void {
  const target = registry.get(to);
  if (!target) return;
  const event: ServerEvent = { type: "typing", from };
  target.send(event);
}
