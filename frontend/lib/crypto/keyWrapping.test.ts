import { describe, expect, it } from "bun:test";
import { generateRsaKeyPair, exportPrivateKey } from "./rsa";
import { wrapPrivateKey, unwrapPrivateKey } from "./keyWrapping";

describe("key wrapping", () => {
  it("wraps and unwraps a private key with the same password, recovering the original key", async () => {
    const keyPair = await generateRsaKeyPair();
    const wrapped = await wrapPrivateKey(keyPair.privateKey, "correct horse battery staple");

    const recovered = await unwrapPrivateKey(wrapped, "correct horse battery staple");

    const original = await exportPrivateKey(keyPair.privateKey);
    const roundTripped = await exportPrivateKey(recovered);
    expect(roundTripped).toBe(original);
  });

  it("fails to unwrap with the wrong password", async () => {
    const keyPair = await generateRsaKeyPair();
    const wrapped = await wrapPrivateKey(keyPair.privateKey, "correct horse battery staple");

    await expect(unwrapPrivateKey(wrapped, "wrong password")).rejects.toThrow();
  });
});
