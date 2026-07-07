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
  const pending: string[] = [];

  socket.onopen = () => {
    for (const data of pending) socket.send(data);
    pending.length = 0;
  };

  socket.onmessage = (event) => {
    const parsed = JSON.parse(event.data as string) as ServerEvent;
    for (const listener of listeners) listener(parsed);
  };

  return {
    send(event: ClientEvent) {
      const data = JSON.stringify(event);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      } else {
        pending.push(data);
      }
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
