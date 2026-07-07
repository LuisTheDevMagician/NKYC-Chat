"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { fetchActiveConversation } from "@/lib/api/messages.api";
import { decryptStoredMessage } from "@/lib/crypto/messageDecryption";
import { sessionStore } from "@/lib/session/session-store";
import type { PresenceUser } from "@/lib/ws/protocol";
import type { ChatMessage } from "@/hooks/useChatSocket";

interface ChatWindowProps {
  peer: PresenceUser | null;
  liveMessages: ChatMessage[];
  typingFrom: number | null;
  onSend(toUserId: number, text: string): void;
  onTyping(toUserId: number): void;
}

export function ChatWindow({ peer, liveMessages, typingFrom, onSend, onTyping }: ChatWindowProps) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const currentUserId = sessionStore.getUser()?.id ?? -1;

  useEffect(() => {
    if (!peer) return;
    let cancelled = false;

    async function loadHistory() {
      const keyPair = await sessionStore.getKeyPair();
      const rows = await fetchActiveConversation(peer!.id);
      if (cancelled || !keyPair) return;
      const decrypted = await Promise.all(
        rows.map((row) => decryptStoredMessage(row, currentUserId, keyPair.privateKey))
      );
      if (!cancelled) setHistory(decrypted);
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [peer, currentUserId]);

  if (!peer) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Selecione um usuário online para conversar.
      </div>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !peer) return;
    onSend(peer.id, draft.trim());
    setDraft("");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {history.map((message, index) => (
          <MessageBubble
            key={`history-${index}`}
            message={message}
            isOwn={message.fromUserId === currentUserId}
            publicKeyBase64={peer.publicKey}
            isLive={false}
          />
        ))}
        {liveMessages.map((message, index) => (
          <MessageBubble
            key={`live-${index}`}
            message={message}
            isOwn={message.fromUserId === currentUserId}
            publicKeyBase64={peer.publicKey}
            isLive
          />
        ))}
        {typingFrom === peer.id && <TypingIndicator username={peer.username} />}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-4">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onTyping(peer.id);
          }}
          placeholder={`Mensagem para ${peer.username}...`}
        />
        <Button type="submit">Enviar</Button>
      </form>
    </div>
  );
}
