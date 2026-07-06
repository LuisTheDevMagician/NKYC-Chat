"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { base64ToBuffer } from "@/lib/crypto/encode";

async function fingerprint(publicKeyBase64: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", base64ToBuffer(publicKeyBase64));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function CryptoBadge({ publicKeyBase64 }: { publicKeyBase64: string }) {
  const [fp, setFp] = useState("");

  useEffect(() => {
    void fingerprint(publicKeyBase64).then(setFp);
  }, [publicKeyBase64]);

  return (
    <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
      AES-256-CBC · RSA-OAEP-2048 · {fp || "…"}
    </Badge>
  );
}
