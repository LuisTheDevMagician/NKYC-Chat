import type { PublicUser } from "../session/session-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function registerUser(username: string, password: string): Promise<PublicUser> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "unknown_error" }));
    throw new Error(body.error ?? "unknown_error");
  }
  return response.json();
}

export async function loginUser(username: string, password: string): Promise<PublicUser> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error("invalid_credentials");
  }
  return response.json();
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
}

export async function fetchCurrentUser(): Promise<PublicUser | null> {
  const response = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
  if (!response.ok) return null;
  return response.json();
}
