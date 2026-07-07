"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "./ChatSidebar";
import { MobileSidebarTrigger } from "./MobileSidebarTrigger";
import { OnlineUsersPanel } from "./OnlineUsersPanel";
import { HistoryPanel } from "./HistoryPanel";
import { HistoryConversationView } from "./HistoryConversationView";
import { ChatWindow } from "./ChatWindow";
import { useChatSocket } from "@/hooks/useChatSocket";

type MainView = "chat" | "online-users" | "history" | "history-detail";

export function ChatLayout() {
  const { onlineUsers, messagesByUser, typingFrom, sendMessage, sendTyping } = useChatSocket();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [view, setView] = useState<MainView>("chat");
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const peer = onlineUsers.find((u) => u.id === selectedUserId) ?? null;

  function handleSelectUser(userId: number) {
    setSelectedUserId(userId);
    setView("chat");
  }

  function handleSelectHistoryConversation(conversationId: number) {
    setSelectedConversationId(conversationId);
    setView("history-detail");
  }

  return (
    <SidebarProvider className="flex-1" defaultOpen={false}>
      <ChatSidebar onShowOnlineUsers={() => setView("online-users")} onShowHistory={() => setView("history")} />
      <SidebarInset className="bg-transparent">
        <div className="hidden items-center gap-2 p-2 md:flex">
          <SidebarTrigger />
        </div>
        {view === "online-users" && <OnlineUsersPanel users={onlineUsers} onSelect={handleSelectUser} />}
        {view === "history" && <HistoryPanel onSelect={handleSelectHistoryConversation} />}
        {view === "history-detail" && selectedConversationId !== null && (
          <HistoryConversationView conversationId={selectedConversationId} onBack={() => setView("history")} />
        )}
        {view === "chat" && (
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
