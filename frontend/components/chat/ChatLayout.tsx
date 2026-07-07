"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserList } from "./UserList";
import { ChatWindow } from "./ChatWindow";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useAuth } from "@/hooks/useAuth";

export function ChatLayout() {
  const { onlineUsers, messagesByUser, typingFrom, sendMessage, sendTyping } = useChatSocket();
  const { logout } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const peer = onlineUsers.find((u) => u.id === selectedUserId) ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-end border-b border-border p-2">
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          <LogOut />
          Sair
        </Button>
      </div>
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
    </div>
  );
}
