import { decryptWithRsaPrivateKey, type RsaPrivateKey } from "./rsa";
import { importAesKey, decryptMessage } from "./aes";
import type { MessageDto } from "../api/messages.api";

export interface DecryptedStoredMessage {
  fromUserId: number;
  text: string | null;
  decodable: boolean;
  createdAt: number;
}

/**
 * Descriptografa uma mensagem persistida pelo backend. O servidor já resolve e retorna a
 * cópia da chave AES deste próprio usuário (cópia do destinatário, cópia do próprio remetente,
 * ou null se nenhuma foi armazenada para ele). Só dá certo se a chave privada da sessão atual
 * for a mesma usada no momento do envio — depois que o usuário faz logout e login de novo, as
 * mensagens antigas caem para o estado "não decodificável".
 */
export async function decryptStoredMessage(row: MessageDto, privateKey: RsaPrivateKey): Promise<DecryptedStoredMessage> {
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
