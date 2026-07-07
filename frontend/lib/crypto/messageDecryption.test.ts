import { describe, expect, it } from "bun:test";
import { generateRsaKeyPair, encryptWithRsaPublicKey } from "./rsa";
import { generateAesKey, exportAesKey, encryptMessage } from "./aes";
import { decryptStoredMessage } from "./messageDecryption";
import type { MessageDto } from "../api/messages.api";

async function buildRow(overrides: Partial<MessageDto> = {}): Promise<{ row: MessageDto; recipientKeyPair: Awaited<ReturnType<typeof generateRsaKeyPair>>; senderKeyPair: Awaited<ReturnType<typeof generateRsaKeyPair>> }> {
  const senderKeyPair = await generateRsaKeyPair();
  const recipientKeyPair = await generateRsaKeyPair();

  const aesKey = await generateAesKey();
  const encrypted = await encryptMessage(aesKey, "oi tudo bem?");
  const rawAesKey = await exportAesKey(aesKey);

  const encryptedAesKey = await encryptWithRsaPublicKey(recipientKeyPair.publicKey, rawAesKey);
  const encryptedAesKeyForSender = await encryptWithRsaPublicKey(senderKeyPair.publicKey, rawAesKey);

  const row: MessageDto = {
    id: 1,
    conversationId: 1,
    fromUserId: 1,
    toUserId: 2,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    encryptedAesKey,
    encryptedAesKeyForSender,
    createdAt: Date.now(),
    ...overrides,
  };

  return { row, recipientKeyPair, senderKeyPair };
}

describe("decryptStoredMessage", () => {
  it("decrypts using the recipient's key when the current user received the message", async () => {
    const { row, recipientKeyPair } = await buildRow();
    const result = await decryptStoredMessage(row, row.toUserId, recipientKeyPair.privateKey);
    expect(result.decodable).toBe(true);
    expect(result.text).toBe("oi tudo bem?");
  });

  it("decrypts using the sender's own copy when the current user sent the message", async () => {
    const { row, senderKeyPair } = await buildRow();
    const result = await decryptStoredMessage(row, row.fromUserId, senderKeyPair.privateKey);
    expect(result.decodable).toBe(true);
    expect(result.text).toBe("oi tudo bem?");
  });

  it("falls back to undecodable when the private key no longer matches (e.g. after a re-login)", async () => {
    const { row } = await buildRow();
    const staleKeyPair = await generateRsaKeyPair();
    const result = await decryptStoredMessage(row, row.toUserId, staleKeyPair.privateKey);
    expect(result.decodable).toBe(false);
    expect(result.text).toBeNull();
  });
});
