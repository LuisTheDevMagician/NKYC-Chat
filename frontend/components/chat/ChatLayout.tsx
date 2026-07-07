"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "./ChatSidebar";
import { MobileSidebarTrigger } from "./MobileSidebarTrigger";
import { OnlineUsersPanel } from "./OnlineUsersPanel";
import { HistoryPanel } from "./HistoryPanel";
import { HistoryConversationView } from "./HistoryConversationView";
import { ChatWindow } from "./ChatWindow";
import { GroupChatWindow } from "./GroupChatWindow";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { GroupInviteModal } from "./GroupInviteModal";
import { useChatSocket } from "@/hooks/useChatSocket";

type MainView = "chat" | "group-chat" | "online-users" | "history" | "history-detail";

export function ChatLayout() {
  const {
    onlineUsers,
    messagesByUser,
    messagesByGroup,
    typingFrom,
    groupTypingFrom,
    activeGroups,
    pendingInvites,
    sendMessage,
    sendGroupMessage,
    sendTyping,
    sendGroupTyping,
    createGroup,
    respondToInvite,
  } = useChatSocket();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [view, setView] = useState<MainView>("chat");
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const peer = onlineUsers.find((u) => u.id === selectedUserId) ?? null;
  const selectedGroup = activeGroups.find((g) => g.id === selectedGroupId) ?? null;

  function handleSelectUser(userId: number) {
    setSelectedUserId(userId);
    setView("chat");
  }

  function handleSelectGroup(conversationId: number) {
    setSelectedGroupId(conversationId);
    setView("group-chat");
  }

  function handleSelectHistoryConversation(conversationId: number) {
    setSelectedConversationId(conversationId);
    setView("history-detail");
  }

  return (
    <SidebarProvider className="flex-1" defaultOpen={false}>
      <ChatSidebar
        onShowOnlineUsers={() => setView("online-users")}
        onShowHistory={() => setView("history")}
        onCreateGroup={() => setCreateGroupOpen(true)}
      />
      <SidebarInset className="bg-transparent">
        <div className="hidden items-center gap-2 p-2 md:flex">
          <SidebarTrigger />
        </div>
        {view === "online-users" && (
          <OnlineUsersPanel
            users={onlineUsers}
            groups={activeGroups}
            onSelect={handleSelectUser}
            onSelectGroup={handleSelectGroup}
          />
        )}
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
        {view === "group-chat" && selectedGroup && (
          <GroupChatWindow
            key={selectedGroup.id}
            group={selectedGroup}
            liveMessages={messagesByGroup[selectedGroup.id] ?? []}
            typingUserId={groupTypingFrom[selectedGroup.id] ?? null}
            onSend={(conversationId, text) => void sendGroupMessage(conversationId, text)}
            onTyping={sendGroupTyping}
          />
        )}
      </SidebarInset>
      <MobileSidebarTrigger />
      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onlineUsers={onlineUsers}
        onCreate={(participantIds, name) => void createGroup(participantIds, name)}
      />
      <GroupInviteModal
        invite={pendingInvites[0] ?? null}
        onRespond={(conversationId, response) => void respondToInvite(conversationId, response)}
      />
    </SidebarProvider>
  );
}
