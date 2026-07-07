import type { CreateUserInput } from "./users.repository";

/** Placeholder crypto fields for tests that don't care about the actual key material. */
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
