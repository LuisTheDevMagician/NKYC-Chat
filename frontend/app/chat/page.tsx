import { RequireAuth } from "@/components/auth/RequireAuth";
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function ChatPage() {
  return (
    <RequireAuth>
      <ChatLayout />
    </RequireAuth>
  );
}
