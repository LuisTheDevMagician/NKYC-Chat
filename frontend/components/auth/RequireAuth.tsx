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
      // The private key only ever exists in sessionStorage after a password-authenticated
      // login (it's unwrapped there, since the password is needed to recover it). A valid
      // session cookie without a key in storage means this is a fresh tab/browser session —
      // there's no way to recover the key without the password, so send the user back to
      // log in again rather than silently generating a throwaway key that can't decrypt anything.
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
