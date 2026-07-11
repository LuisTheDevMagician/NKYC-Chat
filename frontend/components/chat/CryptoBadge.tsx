"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { base64ToBuffer } from "@/lib/crypto/encode";
import { sha256Hex } from "@/lib/crypto/hash";

function fingerprint(publicKeyBase64: string): string {
  // Primeiros 4 bytes (8 caracteres hex) do SHA-256 da chave pública.
  return sha256Hex(base64ToBuffer(publicKeyBase64)).slice(0, 8);
}

export function CryptoBadge({ publicKeyBase64 }: { publicKeyBase64: string }) {
  // O SHA-256 do node-forge é síncrono, então a impressão digital é calculada durante a renderização.
  const fp = useMemo(() => fingerprint(publicKeyBase64), [publicKeyBase64]);

  return (
    <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
      AES-256-CBC · RSA-OAEP-2048 · {fp || "…"}
    </Badge>
  );
}
