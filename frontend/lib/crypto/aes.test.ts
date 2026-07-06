import { describe, expect, it } from "bun:test";
import { generateAesKey, exportAesKey, importAesKey, encryptMessage, decryptMessage } from "./aes";

describe("AES-256-CBC helpers", () => {
  it("encrypts and decrypts a message with the same key", async () => {
    const key = await generateAesKey();
    const encrypted = await encryptMessage(key, "olá, mundo cifrado");
    const decrypted = await decryptMessage(key, encrypted);
    expect(decrypted).toBe("olá, mundo cifrado");
  });

  it("round-trips a key through export/import and still decrypts", async () => {
    const key = await generateAesKey();
    const raw = await exportAesKey(key);
    const importedKey = await importAesKey(raw);

    const encrypted = await encryptMessage(key, "chave exportada");
    const decrypted = await decryptMessage(importedKey, encrypted);
    expect(decrypted).toBe("chave exportada");
  });

  it("uses a different IV for each message", async () => {
    const key = await generateAesKey();
    const first = await encryptMessage(key, "mesma mensagem");
    const second = await encryptMessage(key, "mesma mensagem");
    expect(first.iv).not.toBe(second.iv);
  });
});
