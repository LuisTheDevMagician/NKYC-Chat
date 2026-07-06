const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface MessageDto {
  id: number;
  fromUserId: number;
  toUserId: number;
  ciphertext: string;
  encryptedAesKey: string;
  iv: string;
  createdAt: number;
}

export async function fetchHistory(withUserId: number): Promise<MessageDto[]> {
  const response = await fetch(`${API_URL}/messages/${withUserId}`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  return response.json();
}
