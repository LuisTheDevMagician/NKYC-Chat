import { describe, expect, it } from "bun:test";
import {
  generateRsaKeyPair,
  exportPublicKey,
  importPublicKey,
  encryptWithRsaPublicKey,
  decryptWithRsaPrivateKey,
} from "./rsa";

describe("RSA-OAEP helpers", () => {
  it("encrypts with an exported/imported public key and decrypts with the private key", async () => {
    const keyPair = await generateRsaKeyPair();
    const exported = await exportPublicKey(keyPair.publicKey);
    const importedPublicKey = await importPublicKey(exported);

    const plaintext = new TextEncoder().encode("aes-key-bytes-placeholder");
    const encrypted = await encryptWithRsaPublicKey(importedPublicKey, plaintext.buffer);
    const decrypted = await decryptWithRsaPrivateKey(keyPair.privateKey, encrypted);

    expect(new TextDecoder().decode(decrypted)).toBe("aes-key-bytes-placeholder");
  });
});
