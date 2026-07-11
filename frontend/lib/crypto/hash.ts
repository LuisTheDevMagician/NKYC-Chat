import forge from "node-forge";
import { bufferToBinary } from "./encode";

/**
 * SHA-256 como string hexadecimal em minúsculas, via node-forge.
 *
 * Usado para impressões digitais (fingerprints) de chave pública e verificações de integridade
 * da chave de sessão. Substitui `crypto.subtle.digest`, que só está disponível em contextos
 * seguros (HTTPS/localhost) e, portanto, falha quando o app é aberto de outro dispositivo via
 * HTTP simples na rede local. A saída é idêntica à do SHA-256 do Web Crypto — mesmo algoritmo,
 * então as impressões digitais não mudam.
 */
export function sha256Hex(data: ArrayBuffer): string {
  const md = forge.md.sha256.create();
  md.update(bufferToBinary(data));
  return md.digest().toHex();
}
