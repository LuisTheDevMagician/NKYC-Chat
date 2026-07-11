import forge from "node-forge";
import { bufferToBinary, binaryToBuffer } from "./encode";

// RSA-OAEP-2048 com SHA-256 tanto no digest do OAEP quanto na máscara MGF1,
// mantendo os mesmos parâmetros que o Web Crypto usava antes da migração para o node-forge.
// Usamos node-forge (JS puro) no lugar de `crypto.subtle` para que a criptografia também
// funcione fora de contextos seguros — ou seja, quando o app é aberto de outro dispositivo
// via HTTP simples na rede local, onde `crypto.subtle` é undefined.
const RSA_KEY_BITS = 2048;
const RSA_PUBLIC_EXPONENT = 0x10001;

// Script (auto-contido) que o node-forge usa em Web Workers para gerar os primos em paralelo,
// servido a partir de `public/forge/`. Precisa ser um caminho ABSOLUTO (começando com "/"):
// se fosse relativo ("forge/prime.worker.js"), numa rota como /auth/register o navegador
// tentaria carregar /auth/forge/prime.worker.js e tomaria 404.
const PRIME_WORKER_SCRIPT = "/forge/prime.worker.js";
// Tempo máximo esperando os Web Workers antes de cair para a geração síncrona (ver abaixo).
const KEYGEN_WORKER_TIMEOUT_MS = 12_000;

function oaepOptions() {
  return {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  };
}

export type RsaPublicKey = forge.pki.rsa.PublicKey;
export type RsaPrivateKey = forge.pki.rsa.PrivateKey;

export interface RsaKeyPair {
  publicKey: RsaPublicKey;
  privateKey: RsaPrivateKey;
}

export function generateRsaKeyPair(): Promise<RsaKeyPair> {
  // A geração de RSA-2048 em JS puro é mais lenta que a antiga versão nativa do Web Crypto.
  // Para não travar a interface durante o cadastro, tentamos primeiro o caminho rápido:
  // geração assíncrona usando Web Workers (não bloqueia a thread principal).
  //
  // Rede de segurança: o caminho com workers do forge não tem tratamento de erro próprio — se
  // os workers não conseguirem carregar/rodar (ex.: bloqueados no navegador), ele simplesmente
  // nunca chama o callback. Por isso, se nada voltar dentro de KEYGEN_WORKER_TIMEOUT_MS, caímos
  // para a geração SÍNCRONA (que bloqueia por alguns segundos, mas sempre conclui). Assim o
  // cadastro nunca fica travado para sempre em nenhum dispositivo.
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (keypair: { publicKey: RsaPublicKey; privateKey: RsaPrivateKey }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(keypair);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      try {
        const keypair = forge.pki.rsa.generateKeyPair({ bits: RSA_KEY_BITS, e: RSA_PUBLIC_EXPONENT });
        finish({ publicKey: keypair.publicKey, privateKey: keypair.privateKey });
      } catch (error) {
        settled = true;
        reject(error);
      }
    }, KEYGEN_WORKER_TIMEOUT_MS);

    forge.pki.rsa.generateKeyPair(
      { bits: RSA_KEY_BITS, e: RSA_PUBLIC_EXPONENT, workers: 2, workerScript: PRIME_WORKER_SCRIPT },
      (err, keypair) => {
        // Em caso de erro, não rejeitamos: deixamos o fallback síncrono do timeout assumir.
        if (err || !keypair) return;
        finish({ publicKey: keypair.publicKey, privateKey: keypair.privateKey });
      }
    );
  });
}

export async function exportPublicKey(publicKey: RsaPublicKey): Promise<string> {
  // SPKI (SubjectPublicKeyInfo) em DER, base64 — mesmo formato de transporte de antes.
  const der = forge.asn1.toDer(forge.pki.publicKeyToAsn1(publicKey)).getBytes();
  return forge.util.encode64(der);
}

export async function importPublicKey(base64: string): Promise<RsaPublicKey> {
  const der = forge.util.decode64(base64);
  return forge.pki.publicKeyFromAsn1(forge.asn1.fromDer(der)) as RsaPublicKey;
}

export async function exportPrivateKey(privateKey: RsaPrivateKey): Promise<string> {
  // PKCS#1 RSAPrivateKey em DER, base64. Consumido apenas pelo nosso próprio código
  // (empacotamento / reimportação), então o envelope exato não precisa interoperar com nada externo.
  const der = forge.asn1.toDer(forge.pki.privateKeyToAsn1(privateKey)).getBytes();
  return forge.util.encode64(der);
}

export async function importPrivateKey(base64: string): Promise<RsaPrivateKey> {
  const der = forge.util.decode64(base64);
  return forge.pki.privateKeyFromAsn1(forge.asn1.fromDer(der)) as RsaPrivateKey;
}

export async function encryptWithRsaPublicKey(
  publicKey: RsaPublicKey,
  data: ArrayBuffer
): Promise<string> {
  const encrypted = publicKey.encrypt(bufferToBinary(data), "RSA-OAEP", oaepOptions());
  return forge.util.encode64(encrypted);
}

export async function decryptWithRsaPrivateKey(
  privateKey: RsaPrivateKey,
  base64: string
): Promise<ArrayBuffer> {
  const decrypted = privateKey.decrypt(forge.util.decode64(base64), "RSA-OAEP", oaepOptions());
  return binaryToBuffer(decrypted);
}
