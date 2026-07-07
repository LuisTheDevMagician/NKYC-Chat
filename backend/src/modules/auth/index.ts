import { Elysia } from "elysia";
import { db } from "../../db/client";
import { createUsersRepository } from "../../db/users.repository";
import { createSessionsRepository } from "../../db/sessions.repository";
import { AuthService, AuthError } from "./service";
import { registerBody, loginBody } from "./model";
import { config } from "../../config";
import { authGuard } from "./guard";

const usersRepository = createUsersRepository(db);
const sessionsRepository = createSessionsRepository(db);

export const authModule = new Elysia({ prefix: "/auth" })
  .use(authGuard)
  .post(
    "/register",
    async ({ body, status }) => {
      try {
        return await AuthService.register(usersRepository, body.username, body.password, {
          publicKey: body.publicKey,
          wrappedPrivateKey: body.wrappedPrivateKey,
          wrapIv: body.wrapIv,
          keySalt: body.keySalt,
        });
      } catch (error) {
        if (error instanceof AuthError) {
          return status(409, { error: "username_taken" });
        }
        throw error;
      }
    },
    { body: registerBody }
  )
  .post(
    "/login",
    async ({ body, status, cookie }) => {
      try {
        const { user, token } = await AuthService.login(
          usersRepository,
          sessionsRepository,
          body.username,
          body.password
        );
        cookie.session.set({
          value: token,
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: config.sessionTtlMs / 1000,
          path: "/",
        });
        return user;
      } catch {
        return status(401, { error: "invalid_credentials" });
      }
    },
    { body: loginBody }
  )
  .get("/me", ({ user }) => user, { isAuthenticated: true })
  .post(
    "/logout",
    ({ cookie }) => {
      if (cookie.session?.value) {
        sessionsRepository.deleteByToken(cookie.session.value);
      }
      cookie.session.path = "/";
      cookie.session.remove();
      return { ok: true };
    },
    { isAuthenticated: true }
  );
