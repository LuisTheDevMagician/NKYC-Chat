import type { UsersRepository } from "../../db/users.repository";
import type { SessionsRepository } from "../../db/sessions.repository";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";
import type { AuthenticatedUser, PublicUser } from "./model";

export class AuthError extends Error {}

export interface KeyMaterial {
  publicKey: string;
  wrappedPrivateKey: string;
  wrapIv: string;
  keySalt: string;
}

export abstract class AuthService {
  static async register(
    usersRepository: UsersRepository,
    username: string,
    password: string,
    keyMaterial: KeyMaterial
  ): Promise<PublicUser> {
    if (usersRepository.findByUsername(username)) {
      throw new AuthError("username_taken");
    }
    const { salt, hash } = await hashPassword(password);
    const user = usersRepository.create({ username, salt, passwordHash: hash, ...keyMaterial });
    return { id: user.id, username: user.username };
  }

  static async login(
    usersRepository: UsersRepository,
    sessionsRepository: SessionsRepository,
    username: string,
    password: string
  ): Promise<{ user: AuthenticatedUser; token: string }> {
    const user = usersRepository.findByUsername(username);
    if (!user) throw new AuthError("invalid_credentials");

    const valid = await verifyPassword(password, user.salt, user.passwordHash);
    if (!valid) throw new AuthError("invalid_credentials");

    const session = createSession(sessionsRepository, user.id);
    return {
      user: {
        id: user.id,
        username: user.username,
        publicKey: user.publicKey,
        wrappedPrivateKey: user.wrappedPrivateKey,
        wrapIv: user.wrapIv,
        keySalt: user.keySalt,
      },
      token: session.token,
    };
  }
}
