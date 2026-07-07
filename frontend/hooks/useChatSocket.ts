"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChatSocket, type ChatSocket } from "../lib/ws/ws-client";
import type { PresenceUser, RecipientKey } from "../lib/ws/protocol";
import { sessionStore } from "../lib/session/session-store";
import { exportPublicKey, importPublicKey, encryptWithRsaPublicKey, decryptWithRsaPrivateKey } from "../lib/crypto/rsa";
import { generateAesKey, exportAesKey, importAesKey, encryptMessage, decryptMessage } from "../lib/crypto/aes";
import { fetchActiveGroups, type ActiveGroupDto } from "../lib/api/messages.api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3000/ws";

export interface ChatMessage {
  fromUserId: number;
  text: string | null;
  decodable: boolean;
  createdAt: number;
}

export interface GroupInvite {
  conversationId: number;
  name: string;
  createdBy: { id: number; username: string };
  participantUsernames: string[];
}

export function useChatSocket() {
  const socketRef = useRef<ChatSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [messagesByUser, setMessagesByUser] = useState<Record<number, ChatMessage[]>>({});
  const [messagesByGroup, setMessagesByGroup] = useState<Record<number, ChatMessage[]>>({});
  const [typingFrom, setTypingFrom] = useState<number | null>(null);
  const [groupTypingFrom, setGroupTypingFrom] = useState<Record<number, number | null>>({});
  const [activeGroups, setActiveGroups] = useState<ActiveGroupDto[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]);
  const activeGroupsRef = useRef<ActiveGroupDto[]>([]);
  useEffect(() => {
    activeGroupsRef.current = activeGroups;
  }, [activeGroups]);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const keyPair = await sessionStore.getKeyPair();
      if (!keyPair) return;

      const socket = createChatSocket(WS_URL);
      socketRef.current = socket;

      const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
      if (cancelled) return;

      void fetchActiveGroups().then((groups) => {
        if (!cancelled) setActiveGroups(groups);
      });

      function appendUserMessage(withUserId: number, message: ChatMessage) {
        setMessagesByUser((prev) => ({
          ...prev,
          [withUserId]: [...(prev[withUserId] ?? []), message],
        }));
      }

      function appendGroupMessage(conversationId: number, message: ChatMessage) {
        setMessagesByGroup((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] ?? []), message],
        }));
      }

      socket.on(async (event) => {
        if (event.type === "presence") {
          setOnlineUsers(event.users);
          return;
        }

        if (event.type === "typing") {
          if (event.conversationId !== undefined) {
            const conversationId = event.conversationId;
            setGroupTypingFrom((prev) => ({ ...prev, [conversationId]: event.from }));
            setTimeout(() => setGroupTypingFrom((prev) => ({ ...prev, [conversationId]: null })), 3000);
          } else {
            setTypingFrom(event.from);
            setTimeout(() => setTypingFrom(null), 3000);
          }
          return;
        }

        if (event.type === "group-invite") {
          setPendingInvites((prev) => [
            ...prev,
            {
              conversationId: event.conversationId,
              name: event.name,
              createdBy: event.createdBy,
              participantUsernames: event.participantUsernames,
            },
          ]);
          return;
        }

        if (event.type === "group-ended") {
          const conversationId = event.conversationId;
          setActiveGroups((prev) => prev.filter((g) => g.id !== conversationId));
          setMessagesByGroup((prev) => {
            const next = { ...prev };
            delete next[conversationId];
            return next;
          });
          return;
        }

        if (event.type === "message") {
          const isGroupMessage = activeGroupsRef.current.some((g) => g.id === event.conversationId);
          try {
            // Re-read the private key from storage (rather than reusing the one captured at
            // connect time) so a tampered/edited key makes new messages fail to decrypt right away.
            const currentKeyPair = await sessionStore.getKeyPair();
            if (!currentKeyPair) throw new Error("no key pair");
            const aesKeyRaw = await decryptWithRsaPrivateKey(currentKeyPair.privateKey, event.encryptedAesKey);
            const aesKey = await importAesKey(aesKeyRaw);
            const text = await decryptMessage(aesKey, { ciphertext: event.ciphertext, iv: event.iv });
            const message = { fromUserId: event.from, text, decodable: true, createdAt: event.createdAt };
            if (isGroupMessage) appendGroupMessage(event.conversationId, message);
            else appendUserMessage(event.from, message);
          } catch {
            const message = { fromUserId: event.from, text: null, decodable: false, createdAt: event.createdAt };
            if (isGroupMessage) appendGroupMessage(event.conversationId, message);
            else appendUserMessage(event.from, message);
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

    const keyPair = await sessionStore.getKeyPair();
    if (!keyPair) return;

    const aesKey = await generateAesKey();
    const encryptedText = await encryptMessage(aesKey, plaintext);
    const rawAesKey = await exportAesKey(aesKey);
    const recipientPublicKey = await importPublicKey(recipient.publicKey);
    const [encryptedAesKeyForRecipient, encryptedAesKeyForSender] = await Promise.all([
      encryptWithRsaPublicKey(recipientPublicKey, rawAesKey),
      encryptWithRsaPublicKey(keyPair.publicKey, rawAesKey),
    ]);

    const currentUserId = sessionStore.getUser()?.id ?? -1;
    socket.send({
      type: "message",
      to: toUserId,
      ciphertext: encryptedText.ciphertext,
      iv: encryptedText.iv,
      recipientKeys: [
        { userId: toUserId, encryptedAesKey: encryptedAesKeyForRecipient },
        { userId: currentUserId, encryptedAesKey: encryptedAesKeyForSender },
      ],
    });

    setMessagesByUser((prev) => ({
      ...prev,
      [toUserId]: [...(prev[toUserId] ?? []), { fromUserId: currentUserId, text: plaintext, decodable: true, createdAt: Date.now() }],
    }));
  }, [onlineUsers]);

  const sendGroupMessage = useCallback(async (conversationId: number, plaintext: string) => {
    const socket = socketRef.current;
    const group = activeGroups.find((g) => g.id === conversationId);
    if (!socket || !group) return;

    const keyPair = await sessionStore.getKeyPair();
    if (!keyPair) return;

    const currentUserId = sessionStore.getUser()?.id ?? -1;
    const aesKey = await generateAesKey();
    const encryptedText = await encryptMessage(aesKey, plaintext);
    const rawAesKey = await exportAesKey(aesKey);

    const recipientKeys: RecipientKey[] = [
      { userId: currentUserId, encryptedAesKey: await encryptWithRsaPublicKey(keyPair.publicKey, rawAesKey) },
    ];
    for (const member of group.members) {
      if (member.id === currentUserId) continue;
      const online = onlineUsers.find((u) => u.id === member.id);
      if (!online) continue;
      const memberPublicKey = await importPublicKey(online.publicKey);
      recipientKeys.push({ userId: member.id, encryptedAesKey: await encryptWithRsaPublicKey(memberPublicKey, rawAesKey) });
    }

    socket.send({
      type: "message",
      conversationId,
      ciphertext: encryptedText.ciphertext,
      iv: encryptedText.iv,
      recipientKeys,
    });

    setMessagesByGroup((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), { fromUserId: currentUserId, text: plaintext, decodable: true, createdAt: Date.now() }],
    }));
  }, [activeGroups, onlineUsers]);

  const sendTyping = useCallback((toUserId: number) => {
    socketRef.current?.send({ type: "typing", to: toUserId });
  }, []);

  const sendGroupTyping = useCallback((conversationId: number) => {
    socketRef.current?.send({ type: "typing", conversationId });
  }, []);

  const createGroup = useCallback(async (participantIds: number[], name?: string) => {
    socketRef.current?.send({ type: "create-group", participantIds, name });
    const groups = await fetchActiveGroups();
    setActiveGroups(groups);
  }, []);

  const respondToInvite = useCallback(async (conversationId: number, response: "accepted" | "declined") => {
    socketRef.current?.send({ type: "respond-group-invite", conversationId, response });
    setPendingInvites((prev) => prev.filter((invite) => invite.conversationId !== conversationId));
    if (response === "accepted") {
      const groups = await fetchActiveGroups();
      setActiveGroups(groups);
    }
  }, []);

  return {
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
  };
}
