import type { CreateUserInput } from "./users.repository";

/** Campos de criptografia de preenchimento para testes que não se importam com o material de chave real. */
export function testUserInput(username: string, salt = "s", passwordHash = "h"): CreateUserInput {
  return {
    username,
    salt,
    passwordHash,
    publicKey: "pub-key",
    wrappedPrivateKey: "wrapped-key",
    wrapIv: "wrap-iv",
    keySalt: "key-salt",
  };
}
