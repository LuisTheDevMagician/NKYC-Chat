import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { createSessionsRepository } from "../../db/sessions.repository";
import { createUsersRepository } from "../../db/users.repository";
import { validateSession } from "./session";

const sessionsRepository = createSessionsRepository(db);
const usersRepository = createUsersRepository(db);

export const authGuard = new Elysia({ name: "auth.guard" }).macro({
  isAuthenticated: {
    cookie: t.Cookie({ session: t.Optional(t.String()) }),
    resolve({ cookie, status }) {
      const token = cookie.session?.value as string | undefined;
      if (!token) return status(401, { error: "unauthorized" });

      const session = validateSession(sessionsRepository, token);
      if (!session) return status(401, { error: "unauthorized" });

      const user = usersRepository.findById(session.userId);
      if (!user) return status(401, { error: "unauthorized" });

      return { user: { id: user.id, username: user.username } };
    },
  },
});
