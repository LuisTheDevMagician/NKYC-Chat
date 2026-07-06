"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser, loginUser, logoutUser } from "../lib/api/auth.api";
import { sessionStore } from "../lib/session/session-store";
import { generateRsaKeyPair } from "../lib/crypto/rsa";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const establishSession = useCallback(async (user: { id: number; username: string }) => {
    sessionStore.setUser(user);
    const keyPair = await generateRsaKeyPair();
    sessionStore.setKeyPair(keyPair);
  }, []);

  const register = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        await registerUser(username, password);
        const user = await loginUser(username, password);
        await establishSession(user);
        router.push("/chat");
      } catch {
        setError("Não foi possível criar a conta. O nome de usuário já pode estar em uso.");
      } finally {
        setLoading(false);
      }
    },
    [establishSession, router]
  );

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const user = await loginUser(username, password);
        await establishSession(user);
        router.push("/chat");
      } catch {
        setError("Usuário ou senha inválidos.");
      } finally {
        setLoading(false);
      }
    },
    [establishSession, router]
  );

  const logout = useCallback(async () => {
    await logoutUser();
    sessionStore.clear();
    router.push("/login");
  }, [router]);

  return { register, login, logout, loading, error };
}
