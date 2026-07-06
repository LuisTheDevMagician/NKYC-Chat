import type { ClientEvent, ServerEvent } from "./protocol";

type Listener = (event: ServerEvent) => void;

export interface ChatSocket {
  send(event: ClientEvent): void;
  on(listener: Listener): () => void;
  close(): void;
}

export function createChatSocket(url: string): ChatSocket {
  const socket = new WebSocket(url);
  const listeners = new Set<Listener>();

  socket.onmessage = (event) => {
    const parsed = JSON.parse(event.data as string) as ServerEvent;
    for (const listener of listeners) listener(parsed);
  };

  return {
    send(event: ClientEvent) {
      socket.send(JSON.stringify(event));
    },
    on(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      socket.close();
    },
  };
}
