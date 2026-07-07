"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./MessageBubble";
import { fetchHistoryMessages, fetchConversationParticipants } from "@/lib/api/messages.api";
import { decryptStoredMessage } from "@/lib/crypto/messageDecryption";
import { sessionStore } from "@/lib/session/session-store";
import type { ChatMessage } from "@/hooks/useChatSocket";

interface HistoryConversationViewProps {
  conversationId: number;
  onBack(): void;
}

export function HistoryConversationView({ conversationId, onBack }: HistoryConversationViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [usernamesById, setUsernamesById] = useState<Map<number, string>>(new Map());
  const currentUserId = sessionStore.getUser()?.id ?? -1;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const keyPair = await sessionStore.getKeyPair();
      const [rows, meta] = await Promise.all([
        fetchHistoryMessages(conversationId),
        fetchConversationParticipants(conversationId),
      ]);
      if (cancelled || !keyPair) return;
      const decrypted = await Promise.all(rows.map((row) => decryptStoredMessage(row, keyPair.privateKey)));
      if (cancelled) return;
      setMessages(decrypted);
      setIsGroup(meta.isGroup);
      setUsernamesById(new Map(meta.participants.map((p) => [p.id, p.username])));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, currentUserId]);

  // Mirror the live group window: only tag the sender on group messages that aren't ours.
  function senderName(fromUserId: number): string | undefined {
    if (!isGroup || fromUserId === currentUserId) return undefined;
    return usernamesById.get(fromUserId);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft />
          Voltar
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            isOwn={message.fromUserId === currentUserId}
            isLive={false}
            senderName={senderName(message.fromUserId)}
          />
        ))}
      </div>
    </div>
  );
}
