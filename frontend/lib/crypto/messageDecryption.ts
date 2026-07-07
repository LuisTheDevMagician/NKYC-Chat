import { decryptWithRsaPrivateKey } from "./rsa";
import { importAesKey, decryptMessage } from "./aes";
import type { MessageDto } from "../api/messages.api";

export interface DecryptedStoredMessage {
  fromUserId: number;
  text: string | null;
  decodable: boolean;
  createdAt: number;
}

/**
 * Decrypts a message persisted by the backend. The server already resolves and returns
 * this user's own copy of the AES key (recipient copy, sender's own copy, or null if none
 * was ever stored for them). Only succeeds if the current session's private key matches
 * the one used at send time — once the user has logged out and back in, older rows fall
 * back to the "undecodable" state.
 */
export async function decryptStoredMessage(row: MessageDto, privateKey: CryptoKey): Promise<DecryptedStoredMessage> {
  const base = { fromUserId: row.fromUserId, createdAt: row.createdAt };
  if (!row.encryptedAesKey) return { ...base, text: null, decodable: false };
  try {
    const aesKeyRaw = await decryptWithRsaPrivateKey(privateKey, row.encryptedAesKey);
    const aesKey = await importAesKey(aesKeyRaw);
    const text = await decryptMessage(aesKey, { ciphertext: row.ciphertext, iv: row.iv });
    return { ...base, text, decodable: true };
  } catch {
    return { ...base, text: null, decodable: false };
  }
}
