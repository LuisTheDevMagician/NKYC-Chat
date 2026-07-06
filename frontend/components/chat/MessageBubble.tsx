"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CryptoBadge } from "./CryptoBadge";
import type { ChatMessage } from "@/hooks/useChatSocket";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  publicKeyBase64: string;
  isLive: boolean;
}

export function MessageBubble({ message, isOwn, publicKeyBase64, isLive }: MessageBubbleProps) {
  const [revealed, setRevealed] = useState(!isLive);

  useEffect(() => {
    if (!isLive) return;
    const timer = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(timer);
  }, [isLive]);

  if (!message.decodable) {
    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <div className="max-w-xs rounded-2xl border border-dashed border-border bg-transparent px-4 py-2 text-sm text-muted-foreground">
          🔒 mensagem de sessão anterior
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-xs rounded-2xl px-4 py-2 text-sm transition-[filter,opacity] duration-200",
          isOwn ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
          !revealed && "blur-sm opacity-60"
        )}
      >
        {message.text}
      </div>
      <CryptoBadge publicKeyBase64={publicKeyBase64} />
    </div>
  );
}
