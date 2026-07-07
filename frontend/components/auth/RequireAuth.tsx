"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, logoutUser } from "@/lib/api/auth.api";
import { sessionStore } from "@/lib/session/session-store";
import { generateRsaKeyPair } from "@/lib/crypto/rsa";
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
      sessionStore.setUser(user);
      if (!(await sessionStore.getKeyPair())) {
        await sessionStore.setKeyPair(await generateRsaKeyPair());
      }
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
