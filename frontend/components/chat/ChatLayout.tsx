"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "./ChatSidebar";
import { MobileSidebarTrigger } from "./MobileSidebarTrigger";
import { OnlineUsersPanel } from "./OnlineUsersPanel";
import { ChatWindow } from "./ChatWindow";
import { useChatSocket } from "@/hooks/useChatSocket";

export function ChatLayout() {
  const { onlineUsers, messagesByUser, typingFrom, sendMessage, sendTyping } = useChatSocket();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const peer = onlineUsers.find((u) => u.id === selectedUserId) ?? null;

  function handleSelect(userId: number) {
    setSelectedUserId(userId);
    setShowOnlineUsers(false);
  }

  return (
    <SidebarProvider className="flex-1" defaultOpen={false}>
      <ChatSidebar onShowOnlineUsers={() => setShowOnlineUsers(true)} />
      <SidebarInset className="bg-transparent">
        <div className="hidden items-center gap-2 p-2 md:flex">
          <SidebarTrigger />
        </div>
        {showOnlineUsers ? (
          <OnlineUsersPanel users={onlineUsers} onSelect={handleSelect} />
        ) : (
          <ChatWindow
            key={peer?.id ?? "none"}
            peer={peer}
            liveMessages={selectedUserId ? messagesByUser[selectedUserId] ?? [] : []}
            typingFrom={typingFrom}
            onSend={(toUserId, text) => void sendMessage(toUserId, text)}
            onTyping={sendTyping}
          />
        )}
      </SidebarInset>
      <MobileSidebarTrigger />
    </SidebarProvider>
  );
}
