const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface MessageDto {
  id: number;
  conversationId: number;
  fromUserId: number;
  toUserId: number;
  ciphertext: string;
  encryptedAesKey: string;
  encryptedAesKeyForSender: string;
  iv: string;
  createdAt: number;
}

export interface ConversationHistoryEntryDto {
  id: number;
  peerId: number;
  peerUsername: string;
  startedAt: number;
  endedAt: number;
}

export async function fetchActiveConversation(withUserId: number): Promise<MessageDto[]> {
  const response = await fetch(`${API_URL}/messages/active/${withUserId}`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  return response.json();
}

export async function fetchHistoryList(): Promise<ConversationHistoryEntryDto[]> {
  const response = await fetch(`${API_URL}/messages/history`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  return response.json();
}

export async function fetchHistoryMessages(conversationId: number): Promise<MessageDto[]> {
  const response = await fetch(`${API_URL}/messages/history/${conversationId}`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  return response.json();
}
