import { bufferToBase64, base64ToBuffer } from "./encode";

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
}

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-CBC", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportAesKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}

export async function importAesKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-CBC" }, true, ["encrypt", "decrypt"]);
}

export async function encryptMessage(key: CryptoKey, plaintext: string): Promise<EncryptedMessage> {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, encoded);
  return { ciphertext: bufferToBase64(ciphertext), iv: bufferToBase64(iv.buffer) };
}

export async function decryptMessage(key: CryptoKey, encrypted: EncryptedMessage): Promise<string> {
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: base64ToBuffer(encrypted.iv) },
    key,
    base64ToBuffer(encrypted.ciphertext)
  );
  return new TextDecoder().decode(plainBuffer);
}
