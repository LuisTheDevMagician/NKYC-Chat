"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser, loginUser, logoutUser } from "../lib/api/auth.api";
import { sessionStore } from "../lib/session/session-store";
import { generateRsaKeyPair, exportPublicKey, importPublicKey } from "../lib/crypto/rsa";
import { wrapPrivateKey, unwrapPrivateKey } from "../lib/crypto/keyWrapping";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const keyPair = await generateRsaKeyPair();
        const publicKey = await exportPublicKey(keyPair.publicKey);
        const wrapped = await wrapPrivateKey(keyPair.privateKey, password);

        await registerUser(username, password, { publicKey, ...wrapped });
        const user = await loginUser(username, password);

        sessionStore.setUser({ id: user.id, username: user.username });
        await sessionStore.setKeyPair(keyPair);
        router.push("/chat");
      } catch {
        setError("Não foi possível criar a conta. O nome de usuário já pode estar em uso.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const user = await loginUser(username, password);
        const privateKey = await unwrapPrivateKey(
          { wrappedPrivateKey: user.wrappedPrivateKey, wrapIv: user.wrapIv, keySalt: user.keySalt },
          password
        );
        const publicKey = await importPublicKey(user.publicKey);

        sessionStore.setUser({ id: user.id, username: user.username });
        await sessionStore.setKeyPair({ publicKey, privateKey });
        router.push("/chat");
      } catch {
        setError("Usuário ou senha inválidos.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    await logoutUser();
    sessionStore.clear();
    router.push("/auth/login");
  }, [router]);

  return { register, login, logout, loading, error };
}
