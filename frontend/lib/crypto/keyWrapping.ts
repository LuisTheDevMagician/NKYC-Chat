import forge from "node-forge";
import { bufferToBase64, base64ToBuffer, bufferToBinary } from "./encode";
import { exportPrivateKey, importPrivateKey, type RsaPrivateKey } from "./rsa";

const PBKDF2_ITERATIONS = 210_000;
const KEK_BYTES = 32; // AES-256 key-encryption key
const GCM_TAG_BYTES = 16;

/** Deriva a chave de cifragem de chave (KEK) AES-256 a partir da senha via PBKDF2-SHA256. Retorna bytes do forge. */
function deriveKek(password: string, saltBase64: string): string {
  const salt = bufferToBinary(base64ToBuffer(saltBase64));
  return forge.pkcs5.pbkdf2(password, salt, PBKDF2_ITERATIONS, KEK_BYTES, forge.md.sha256.create());
}

export interface WrappedPrivateKey {
  wrappedPrivateKey: string;
  wrapIv: string;
  keySalt: string;
}

/**
 * Empacota (cifra) uma chave privada RSA com uma chave derivada da senha da conta, para que o
 * mesmo par de chaves possa ser recuperado num login futuro em vez de gerar um novo a cada vez
 * — caso contrário o histórico de mensagens nunca mais seria legível após o logout.
 *
 * AES-GCM via node-forge. Para manter o formato do envelope armazenado idêntico à implementação
 * anterior com Web Crypto, a tag de autenticação de 16 bytes é anexada ao final do ciphertext.
 */
export async function wrapPrivateKey(privateKey: RsaPrivateKey, password: string): Promise<WrappedPrivateKey> {
  const keySalt = bufferToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const kek = deriveKek(password, keySalt);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawPrivateKey = forge.util.decode64(await exportPrivateKey(privateKey));

  const cipher = forge.cipher.createCipher("AES-GCM", kek);
  cipher.start({ iv: bufferToBinary(iv.buffer), tagLength: GCM_TAG_BYTES * 8 });
  cipher.update(forge.util.createBuffer(rawPrivateKey));
  cipher.finish();
  const wrapped = cipher.output.getBytes() + cipher.mode.tag.getBytes();

  return {
    wrappedPrivateKey: forge.util.encode64(wrapped),
    wrapIv: bufferToBase64(iv.buffer),
    keySalt,
  };
}

export async function unwrapPrivateKey(
  wrapped: WrappedPrivateKey,
  password: string
): Promise<RsaPrivateKey> {
  const kek = deriveKek(password, wrapped.keySalt);

  const data = forge.util.decode64(wrapped.wrappedPrivateKey);
  const ciphertext = data.slice(0, data.length - GCM_TAG_BYTES);
  const tag = data.slice(data.length - GCM_TAG_BYTES);

  const decipher = forge.cipher.createDecipher("AES-GCM", kek);
  decipher.start({
    iv: bufferToBinary(base64ToBuffer(wrapped.wrapIv)),
    tagLength: GCM_TAG_BYTES * 8,
    tag: forge.util.createBuffer(tag),
  });
  decipher.update(forge.util.createBuffer(ciphertext));
  // Com a senha errada, a KEK derivada fica errada, a tag do GCM não confere e finish() retorna false.
  if (!decipher.finish()) throw new Error("Failed to unwrap private key: wrong password or corrupted key");

  return importPrivateKey(forge.util.encode64(decipher.output.getBytes()));
}
