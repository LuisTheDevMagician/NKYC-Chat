import { describe, expect, it } from "bun:test";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its own hash", async () => {
    const { salt, hash } = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", salt, hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const { salt, hash } = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", salt, hash)).toBe(false);
  });

  it("produces different salts for the same password", async () => {
    const first = await hashPassword("same-password");
    const second = await hashPassword("same-password");
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });
});
