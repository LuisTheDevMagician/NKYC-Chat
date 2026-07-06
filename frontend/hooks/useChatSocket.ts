"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChatSocket, type ChatSocket } from "../lib/ws/ws-client";
import type { PresenceUser } from "../lib/ws/protocol";
import { sessionStore } from "../lib/session/session-store";
import { exportPublicKey, importPublicKey, encryptWithRsaPublicKey, decryptWithRsaPrivateKey } from "../lib/crypto/rsa";
import { generateAesKey, exportAesKey, importAesKey, encryptMessage, decryptMessage } from "../lib/crypto/aes";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3000/ws";

export interface ChatMessage {
  fromUserId: number;
  text: string | null;
  decodable: boolean;
  createdAt: number;
}

export function useChatSocket() {
  const socketRef = useRef<ChatSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [messagesByUser, setMessagesByUser] = useState<Record<number, ChatMessage[]>>({});
  const [typingFrom, setTypingFrom] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const keyPair = sessionStore.getKeyPair();
      if (!keyPair) return;

      const socket = createChatSocket(WS_URL);
      socketRef.current = socket;

      const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
      if (cancelled) return;

      function appendMessage(withUserId: number, message: ChatMessage) {
        setMessagesByUser((prev) => ({
          ...prev,
          [withUserId]: [...(prev[withUserId] ?? []), message],
        }));
      }

      socket.on(async (event) => {
        if (event.type === "presence") {
          setOnlineUsers(event.users);
          return;
        }
        if (event.type === "typing") {
          setTypingFrom(event.from);
          setTimeout(() => setTypingFrom(null), 3000);
          return;
        }
        if (event.type === "message") {
          try {
            const aesKeyRaw = await decryptWithRsaPrivateKey(keyPair.privateKey, event.encryptedAesKey);
            const aesKey = await importAesKey(aesKeyRaw);
            const text = await decryptMessage(aesKey, { ciphertext: event.ciphertext, iv: event.iv });
            appendMessage(event.from, { fromUserId: event.from, text, decodable: true, createdAt: event.createdAt });
          } catch {
            appendMessage(event.from, {
              fromUserId: event.from,
              text: null,
              decodable: false,
              createdAt: event.createdAt,
            });
          }
        }
      });

      socket.send({ type: "hello", publicKey: publicKeyBase64 });
    }

    void connect();
    return () => {
      cancelled = true;
      socketRef.current?.close();
    };
  }, []);

  const sendMessage = useCallback(async (toUserId: number, plaintext: string) => {
    const socket = socketRef.current;
    const recipient = onlineUsers.find((u) => u.id === toUserId);
    if (!socket || !recipient) return;

    const aesKey = await generateAesKey();
    const encryptedText = await encryptMessage(aesKey, plaintext);
    const rawAesKey = await exportAesKey(aesKey);
    const recipientPublicKey = await importPublicKey(recipient.publicKey);
    const encryptedAesKey = await encryptWithRsaPublicKey(recipientPublicKey, rawAesKey);

    socket.send({
      type: "message",
      to: toUserId,
      ciphertext: encryptedText.ciphertext,
      iv: encryptedText.iv,
      encryptedAesKey,
    });

    setMessagesByUser((prev) => ({
      ...prev,
      [toUserId]: [
        ...(prev[toUserId] ?? []),
        { fromUserId: sessionStore.getUser()?.id ?? -1, text: plaintext, decodable: true, createdAt: Date.now() },
      ],
    }));
  }, [onlineUsers]);

  const sendTyping = useCallback((toUserId: number) => {
    socketRef.current?.send({ type: "typing", to: toUserId });
  }, []);

  return { onlineUsers, messagesByUser, typingFrom, sendMessage, sendTyping };
}
