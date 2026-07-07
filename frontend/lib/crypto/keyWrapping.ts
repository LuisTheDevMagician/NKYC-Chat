import { bufferToBase64, base64ToBuffer } from "./encode";

const PBKDF2_ITERATIONS = 210_000;

async function deriveKek(password: string, saltBase64: string): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: base64ToBuffer(saltBase64), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface WrappedPrivateKey {
  wrappedPrivateKey: string;
  wrapIv: string;
  keySalt: string;
}

/**
 * Wraps (encrypts) an RSA private key with a key derived from the account password, so the
 * same key pair can be recovered on a future login instead of generating a new one each time
 * — otherwise message history would never be readable again after logging out.
 */
export async function wrapPrivateKey(privateKey: CryptoKey, password: string): Promise<WrappedPrivateKey> {
  const keySalt = bufferToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const kek = await deriveKek(password, keySalt);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawPrivateKey = await crypto.subtle.exportKey("pkcs8", privateKey);
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, rawPrivateKey);

  return {
    wrappedPrivateKey: bufferToBase64(wrapped),
    wrapIv: bufferToBase64(iv.buffer),
    keySalt,
  };
}

export async function unwrapPrivateKey(
  wrapped: WrappedPrivateKey,
  password: string
): Promise<CryptoKey> {
  const kek = await deriveKek(password, wrapped.keySalt);
  const rawPrivateKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(wrapped.wrapIv) },
    kek,
    base64ToBuffer(wrapped.wrappedPrivateKey)
  );
  return crypto.subtle.importKey(
    "pkcs8",
    rawPrivateKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}
