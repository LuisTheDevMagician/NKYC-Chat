"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { fetchGroupMessages, type ActiveGroupDto } from "@/lib/api/messages.api";
import { decryptStoredMessage } from "@/lib/crypto/messageDecryption";
import { sessionStore } from "@/lib/session/session-store";
import type { ChatMessage } from "@/hooks/useChatSocket";

interface GroupChatWindowProps {
  group: ActiveGroupDto;
  liveMessages: ChatMessage[];
  typingUserId: number | null;
  onSend(conversationId: number, text: string): void;
  onTyping(conversationId: number): void;
}

export function GroupChatWindow({ group, liveMessages, typingUserId, onSend, onTyping }: GroupChatWindowProps) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const currentUserId = sessionStore.getUser()?.id ?? -1;
  const typingUsername = group.members.find((m) => m.id === typingUserId)?.username;

  function senderName(fromUserId: number): string | undefined {
    if (fromUserId === currentUserId) return undefined;
    return group.members.find((m) => m.id === fromUserId)?.username;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const keyPair = await sessionStore.getKeyPair();
      const rows = await fetchGroupMessages(group.id);
      if (cancelled || !keyPair) return;
      const decrypted = await Promise.all(rows.map((row) => decryptStoredMessage(row, keyPair.privateKey)));
      if (!cancelled) setHistory(decrypted);
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [group.id]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(group.id, draft.trim());
    setDraft("");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border p-3">
        <p className="font-heading text-sm text-foreground">{group.name}</p>
        <p className="text-xs text-muted-foreground">{group.members.map((m) => m.username).join(", ")}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {history.map((message, index) => (
          <MessageBubble
            key={`history-${index}`}
            message={message}
            isOwn={message.fromUserId === currentUserId}
            senderName={senderName(message.fromUserId)}
            isLive={false}
          />
        ))}
        {liveMessages.map((message, index) => (
          <MessageBubble
            key={`live-${index}`}
            message={message}
            isOwn={message.fromUserId === currentUserId}
            senderName={senderName(message.fromUserId)}
            isLive
          />
        ))}
        {typingUsername && <TypingIndicator username={typingUsername} />}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-4">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onTyping(group.id);
          }}
          placeholder={`Mensagem para ${group.name}...`}
        />
        <Button type="submit">Enviar</Button>
      </form>
    </div>
  );
}
