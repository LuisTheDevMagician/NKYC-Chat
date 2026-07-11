import forge from "node-forge";
import { bufferToBase64, base64ToBuffer, bufferToBinary } from "./encode";

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
}

// AES-256-CBC via node-forge. Uma chave AES é apenas seus 32 bytes brutos; diferente do
// antigo `CryptoKey` do Web Crypto, é um ArrayBuffer comum, então export/import são operações de identidade.
export type AesKey = ArrayBuffer;

const AES_KEY_BYTES = 32; // AES-256
const AES_IV_BYTES = 16; // CBC block size

export async function generateAesKey(): Promise<AesKey> {
  // getRandomValues (diferente de crypto.subtle) também está disponível em contextos inseguros.
  return crypto.getRandomValues(new Uint8Array(AES_KEY_BYTES)).buffer;
}

export async function exportAesKey(key: AesKey): Promise<ArrayBuffer> {
  return key;
}

export async function importAesKey(raw: ArrayBuffer): Promise<AesKey> {
  return raw;
}

export async function encryptMessage(key: AesKey, plaintext: string): Promise<EncryptedMessage> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_BYTES));
  const cipher = forge.cipher.createCipher("AES-CBC", bufferToBinary(key));
  cipher.start({ iv: bufferToBinary(iv.buffer) });
  cipher.update(forge.util.createBuffer(forge.util.encodeUtf8(plaintext)));
  cipher.finish();
  return {
    ciphertext: forge.util.encode64(cipher.output.getBytes()),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptMessage(key: AesKey, encrypted: EncryptedMessage): Promise<string> {
  const decipher = forge.cipher.createDecipher("AES-CBC", bufferToBinary(key));
  decipher.start({ iv: bufferToBinary(base64ToBuffer(encrypted.iv)) });
  decipher.update(forge.util.createBuffer(forge.util.decode64(encrypted.ciphertext)));
  if (!decipher.finish()) throw new Error("AES-CBC decryption failed");
  return forge.util.decodeUtf8(decipher.output.getBytes());
}
