import { describe, expect, test } from "bun:test";
import { createChatSocket } from "./ws-client";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    if (this.readyState !== FakeWebSocket.OPEN) {
      throw new DOMException("Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.", "InvalidStateError");
    }
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  triggerOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
}

describe("createChatSocket", () => {
  test("queues a send() made before the socket finishes connecting", () => {
    FakeWebSocket.instances = [];
    const original = globalThis.WebSocket;
    // @ts-expect-error test double, not a full WebSocket implementation
    globalThis.WebSocket = FakeWebSocket;

    try {
      const chatSocket = createChatSocket("ws://localhost/ws");
      const fake = FakeWebSocket.instances[0];

      expect(() => chatSocket.send({ type: "hello", publicKey: "abc" })).not.toThrow();
      expect(fake.sent).toHaveLength(0);

      fake.triggerOpen();

      expect(fake.sent).toHaveLength(1);
      expect(JSON.parse(fake.sent[0])).toEqual({ type: "hello", publicKey: "abc" });
    } finally {
      globalThis.WebSocket = original;
    }
  });
});
