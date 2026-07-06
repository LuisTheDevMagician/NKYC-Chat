export interface Connection {
  userId: number;
  username: string;
  publicKey: string;
  send(event: unknown): void;
}

export function createConnectionRegistry() {
  const connections = new Map<number, Connection>();
  return {
    add(connection: Connection): void {
      connections.set(connection.userId, connection);
    },
    remove(userId: number): void {
      connections.delete(userId);
    },
    get(userId: number): Connection | undefined {
      return connections.get(userId);
    },
    list(): Connection[] {
      return Array.from(connections.values());
    },
  };
}

export type ConnectionRegistry = ReturnType<typeof createConnectionRegistry>;
