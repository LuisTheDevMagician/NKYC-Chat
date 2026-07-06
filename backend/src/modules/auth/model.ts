import { t } from "elysia";

export const registerBody = t.Object({
  username: t.String({ minLength: 3, maxLength: 32 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
});
export type RegisterBody = typeof registerBody.static;

export const loginBody = t.Object({
  username: t.String(),
  password: t.String(),
});
export type LoginBody = typeof loginBody.static;

export const publicUser = t.Object({
  id: t.Number(),
  username: t.String(),
});
export type PublicUser = typeof publicUser.static;
