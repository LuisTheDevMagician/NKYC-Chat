import { bufferToBase64, base64ToBuffer } from "./encode";

const RSA_ALGORITHM = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
} as const;

export interface RsaKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export async function generateRsaKeyPair(): Promise<RsaKeyPair> {
  const keyPair = await crypto.subtle.generateKey(RSA_ALGORITHM, true, ["encrypt", "decrypt"]);
  return keyPair as RsaKeyPair;
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("spki", publicKey);
  return bufferToBase64(raw);
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    base64ToBuffer(base64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

export async function encryptWithRsaPublicKey(
  publicKey: CryptoKey,
  data: ArrayBuffer
): Promise<string> {
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data);
  return bufferToBase64(encrypted);
}

export async function decryptWithRsaPrivateKey(
  privateKey: CryptoKey,
  base64: string
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, base64ToBuffer(base64));
}
