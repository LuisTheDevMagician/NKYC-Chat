import { config } from "../../config";
import type { SessionsRepository, SessionRow } from "../../db/sessions.repository";

export function createSession(
  sessionsRepository: SessionsRepository,
  userId: number
): SessionRow {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + config.sessionTtlMs;
  return sessionsRepository.create(token, userId, expiresAt);
}

export function validateSession(
  sessionsRepository: SessionsRepository,
  token: string
): SessionRow | null {
  const session = sessionsRepository.findByToken(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessionsRepository.deleteByToken(token);
    return null;
  }
  return session;
}
