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
 * Decrypts a message persisted by the backend, using whichever encrypted AES key
 * applies to the current user (recipient copy or sender's own copy). Only succeeds
 * if the current session's private key matches the one used at send time — once the
 * user has logged out and back in, older rows fall back to the "undecodable" state.
 */
export async function decryptStoredMessage(
  row: MessageDto,
  currentUserId: number,
  privateKey: CryptoKey
): Promise<DecryptedStoredMessage> {
  const base = { fromUserId: row.fromUserId, createdAt: row.createdAt };
  try {
    const encryptedAesKey = row.toUserId === currentUserId ? row.encryptedAesKey : row.encryptedAesKeyForSender;
    const aesKeyRaw = await decryptWithRsaPrivateKey(privateKey, encryptedAesKey);
    const aesKey = await importAesKey(aesKeyRaw);
    const text = await decryptMessage(aesKey, { ciphertext: row.ciphertext, iv: row.iv });
    return { ...base, text, decodable: true };
  } catch {
    return { ...base, text: null, decodable: false };
  }
}
