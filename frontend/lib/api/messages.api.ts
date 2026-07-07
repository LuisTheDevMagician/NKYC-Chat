const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface MessageDto {
  id: number;
  conversationId: number;
  fromUserId: number;
  ciphertext: string;
  iv: string;
  createdAt: number;
  encryptedAesKey: string | null;
}

export interface ConversationHistoryEntryDto {
  id: number;
  title: string;
  isGroup: boolean;
  startedAt: number;
  endedAt: number;
}

export interface ActiveGroupMemberDto {
  id: number;
  username: string;
}

export interface ActiveGroupDto {
  id: number;
  name: string;
  members: ActiveGroupMemberDto[];
}

export async function fetchActiveConversation(withUserId: number): Promise<MessageDto[]> {
  const response = await fetch(`${API_URL}/messages/active/${withUserId}`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  return response.json();
}

export async function fetchActiveGroups(): Promise<ActiveGroupDto[]> {
  const response = await fetch(`${API_URL}/messages/groups`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  return response.json();
}

export async function fetchGroupMessages(conversationId: number): Promise<MessageDto[]> {
  const response = await fetch(`${API_URL}/messages/group/${conversationId}`, {
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
