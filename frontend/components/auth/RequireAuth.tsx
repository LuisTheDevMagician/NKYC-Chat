"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, logoutUser } from "@/lib/api/auth.api";
import { sessionStore } from "@/lib/session/session-store";
import { ViolationScreen } from "./ViolationScreen";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [violation, setViolation] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const user = await fetchCurrentUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      // A chave privada só existe no sessionStorage depois de um login autenticado por senha
      // (é lá que ela é desempacotada, já que a senha é necessária para recuperá-la). Um cookie
      // de sessão válido sem uma chave no storage significa que esta é uma aba/sessão de navegador
      // nova — não há como recuperar a chave sem a senha, então mandamos o usuário fazer login de
      // novo em vez de gerar silenciosamente uma chave descartável que não descriptografa nada.
      if (!(await sessionStore.getKeyPair())) {
        router.push("/auth/login");
        return;
      }
      sessionStore.setUser(user);
      if (!cancelled) setReady(true);
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      void sessionStore.checkIntegrity().then((ok) => {
        if (!ok) setViolation(true);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (!violation) return;
    const timeout = setTimeout(() => {
      void logoutUser();
      sessionStore.clear();
      router.push("/auth/login");
    }, 1500);
    return () => clearTimeout(timeout);
  }, [violation, router]);

  if (violation) return <ViolationScreen />;
  if (!ready) return null;
  return <>{children}</>;
}
