import { describe, expect, it } from "bun:test";
import { generateRsaKeyPair, encryptWithRsaPublicKey } from "./rsa";
import { generateAesKey, exportAesKey, encryptMessage } from "./aes";
import { decryptStoredMessage } from "./messageDecryption";
import type { MessageDto } from "../api/messages.api";

async function buildRow(overrides: Partial<MessageDto> = {}): Promise<{
  row: MessageDto;
  keyPair: Awaited<ReturnType<typeof generateRsaKeyPair>>;
}> {
  const keyPair = await generateRsaKeyPair();

  const aesKey = await generateAesKey();
  const encrypted = await encryptMessage(aesKey, "oi tudo bem?");
  const rawAesKey = await exportAesKey(aesKey);
  const encryptedAesKey = await encryptWithRsaPublicKey(keyPair.publicKey, rawAesKey);

  const row: MessageDto = {
    id: 1,
    conversationId: 1,
    fromUserId: 1,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    encryptedAesKey,
    createdAt: Date.now(),
    ...overrides,
  };

  return { row, keyPair };
}

describe("decryptStoredMessage", () => {
  it("decrypts when the private key matches the one the AES key was encrypted for", async () => {
    const { row, keyPair } = await buildRow();
    const result = await decryptStoredMessage(row, keyPair.privateKey);
    expect(result.decodable).toBe(true);
    expect(result.text).toBe("oi tudo bem?");
  });

  it("falls back to undecodable when the private key no longer matches (e.g. after a re-login)", async () => {
    const { row } = await buildRow();
    const staleKeyPair = await generateRsaKeyPair();
    const result = await decryptStoredMessage(row, staleKeyPair.privateKey);
    expect(result.decodable).toBe(false);
    expect(result.text).toBeNull();
  });

  it("is undecodable when the server never stored a key for this user", async () => {
    const { row, keyPair } = await buildRow({ encryptedAesKey: null });
    const result = await decryptStoredMessage(row, keyPair.privateKey);
    expect(result.decodable).toBe(false);
    expect(result.text).toBeNull();
  });
});
