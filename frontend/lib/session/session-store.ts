import type { RsaKeyPair } from "../crypto/rsa";

export interface PublicUser {
  id: number;
  username: string;
}

let currentUser: PublicUser | null = null;
let currentKeyPair: RsaKeyPair | null = null;

export const sessionStore = {
  setUser(user: PublicUser): void {
    currentUser = user;
  },
  getUser(): PublicUser | null {
    return currentUser;
  },
  setKeyPair(keyPair: RsaKeyPair): void {
    currentKeyPair = keyPair;
  },
  getKeyPair(): RsaKeyPair | null {
    return currentKeyPair;
  },
  clear(): void {
    currentUser = null;
    currentKeyPair = null;
  },
};
