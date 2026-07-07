"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatSidebar } from "./ChatSidebar";
import { MobileSidebarTrigger } from "./MobileSidebarTrigger";
import { DesktopSidebarTrigger } from "./DesktopSidebarTrigger";
import { ChatWindow } from "./ChatWindow";
import { useChatSocket } from "@/hooks/useChatSocket";

export function ChatLayout() {
  const { onlineUsers, messagesByUser, typingFrom, sendMessage, sendTyping } = useChatSocket();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const peer = onlineUsers.find((u) => u.id === selectedUserId) ?? null;

  return (
    <SidebarProvider className="flex-1" defaultOpen={false}>
      <ChatSidebar onlineUsers={onlineUsers} selectedUserId={selectedUserId} onSelect={setSelectedUserId} />
      <SidebarInset className="bg-transparent">
        <div className="flex items-center gap-2 p-2">
          <DesktopSidebarTrigger />
        </div>
        <ChatWindow
          key={peer?.id ?? "none"}
          peer={peer}
          liveMessages={selectedUserId ? messagesByUser[selectedUserId] ?? [] : []}
          typingFrom={typingFrom}
          onSend={(toUserId, text) => void sendMessage(toUserId, text)}
          onTyping={sendTyping}
        />
      </SidebarInset>
      <MobileSidebarTrigger />
    </SidebarProvider>
  );
}
