"use client";

import { useState } from "react";
import { UserList } from "./UserList";
import { ChatWindow } from "./ChatWindow";
import { useChatSocket } from "@/hooks/useChatSocket";

export function ChatLayout() {
  const { onlineUsers, messagesByUser, typingFrom, sendMessage, sendTyping } = useChatSocket();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const peer = onlineUsers.find((u) => u.id === selectedUserId) ?? null;

  return (
    <div className="flex flex-1">
      <UserList users={onlineUsers} selectedUserId={selectedUserId} onSelect={setSelectedUserId} />
      <ChatWindow
        key={peer?.id ?? "none"}
        peer={peer}
        liveMessages={selectedUserId ? messagesByUser[selectedUserId] ?? [] : []}
        typingFrom={typingFrom}
        onSend={(toUserId, text) => void sendMessage(toUserId, text)}
        onTyping={sendTyping}
      />
    </div>
  );
}
