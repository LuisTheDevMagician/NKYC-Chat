import type { RsaKeyPair } from "../crypto/rsa";
import { exportPublicKey, exportPrivateKey, importPublicKey, importPrivateKey } from "../crypto/rsa";

export interface PublicUser {
  id: number;
  username: string;
}

const KEYS_STORAGE_KEY = "nkyc.session.keys";
const INTEGRITY_STORAGE_KEY = "nkyc.session.integrity";

interface StoredKeyPair {
  publicKey: string;
  privateKey: string;
}

let currentUser: PublicUser | null = null;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const sessionStore = {
  setUser(user: PublicUser): void {
    currentUser = user;
  },
  getUser(): PublicUser | null {
    return currentUser;
  },

  async setKeyPair(keyPair: RsaKeyPair): Promise<void> {
    const stored: StoredKeyPair = {
      publicKey: await exportPublicKey(keyPair.publicKey),
      privateKey: await exportPrivateKey(keyPair.privateKey),
    };
    const json = JSON.stringify(stored);
    sessionStorage.setItem(KEYS_STORAGE_KEY, json);
    sessionStorage.setItem(INTEGRITY_STORAGE_KEY, await sha256Hex(json));
  },

  async getKeyPair(): Promise<RsaKeyPair | null> {
    const json = sessionStorage.getItem(KEYS_STORAGE_KEY);
    if (!json) return null;
    try {
      const stored = JSON.parse(json) as StoredKeyPair;
      const [publicKey, privateKey] = await Promise.all([
        importPublicKey(stored.publicKey),
        importPrivateKey(stored.privateKey),
      ]);
      return { publicKey, privateKey };
    } catch {
      return null;
    }
  },

  /** Compares the stored keys against the fingerprint saved alongside them, to catch tampering via DevTools. */
  async checkIntegrity(): Promise<boolean> {
    const json = sessionStorage.getItem(KEYS_STORAGE_KEY);
    const expected = sessionStorage.getItem(INTEGRITY_STORAGE_KEY);
    if (!json || !expected) return false;
    return (await sha256Hex(json)) === expected;
  },

  clear(): void {
    currentUser = null;
    sessionStorage.removeItem(KEYS_STORAGE_KEY);
    sessionStorage.removeItem(INTEGRITY_STORAGE_KEY);
  },
};
