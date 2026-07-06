import { describe, expect, it } from "bun:test";
import { bufferToBase64, base64ToBuffer } from "./encode";

describe("base64 encoding", () => {
  it("round-trips arbitrary bytes", () => {
    const original = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    const base64 = bufferToBase64(original.buffer);
    const decoded = new Uint8Array(base64ToBuffer(base64));
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("produces a non-empty base64 string", () => {
    const buffer = new TextEncoder().encode("hello").buffer;
    expect(bufferToBase64(buffer).length).toBeGreaterThan(0);
  });
});
