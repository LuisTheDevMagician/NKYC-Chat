import type { UsersRepository } from "../../db/users.repository";
import type { SessionsRepository } from "../../db/sessions.repository";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";
import type { PublicUser } from "./model";

export class AuthError extends Error {}

export abstract class AuthService {
  static async register(
    usersRepository: UsersRepository,
    username: string,
    password: string
  ): Promise<PublicUser> {
    if (usersRepository.findByUsername(username)) {
      throw new AuthError("username_taken");
    }
    const { salt, hash } = await hashPassword(password);
    const user = usersRepository.create(username, salt, hash);
    return { id: user.id, username: user.username };
  }

  static async login(
    usersRepository: UsersRepository,
    sessionsRepository: SessionsRepository,
    username: string,
    password: string
  ): Promise<{ user: PublicUser; token: string }> {
    const user = usersRepository.findByUsername(username);
    if (!user) throw new AuthError("invalid_credentials");

    const valid = await verifyPassword(password, user.salt, user.passwordHash);
    if (!valid) throw new AuthError("invalid_credentials");

    const session = createSession(sessionsRepository, user.id);
    return { user: { id: user.id, username: user.username }, token: session.token };
  }
}
