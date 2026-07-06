"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api/auth.api";
import { sessionStore } from "@/lib/session/session-store";
import { generateRsaKeyPair } from "@/lib/crypto/rsa";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const user = await fetchCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      sessionStore.setUser(user);
      if (!sessionStore.getKeyPair()) {
        sessionStore.setKeyPair(await generateRsaKeyPair());
      }
      if (!cancelled) setReady(true);
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
