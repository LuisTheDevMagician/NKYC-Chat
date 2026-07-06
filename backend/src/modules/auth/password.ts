import { config } from "../../config";

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function derive(password: string, saltBytes: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes as BufferSource,
      iterations: config.pbkdf2Iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    config.hashBytes * 8
  );
  return new Uint8Array(derived);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(config.saltBytes));
  const hashBytes = await derive(password, saltBytes);
  return { salt: toBase64(saltBytes), hash: toBase64(hashBytes) };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const saltBytes = fromBase64(salt);
  const hashBytes = await derive(password, saltBytes);
  return timingSafeEqual(hashBytes, fromBase64(expectedHash));
}
