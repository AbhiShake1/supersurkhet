import { useCallback, useEffect, useState } from 'react';

type ChatMessage = {
  _?: {
    soul?: string;
  };
  created_by: string;
  content: string;
  sender_id: string;
  sender_name: string;
  timestamp: number;
  delivered: boolean;
  read: boolean;
};

const chatRoomStore = new Map<string, ChatMessage[]>();

function getRoomMessages(roomId: string): ChatMessage[] {
  return chatRoomStore.get(roomId) ?? [];
}

function setRoomMessages(roomId: string, messages: ChatMessage[]) {
  chatRoomStore.set(roomId, messages);
}

export function useChat(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    getRoomMessages(roomId),
  );

  useEffect(() => {
    setMessages(getRoomMessages(roomId));
  }, [roomId]);

  const sendMessage = useCallback(
    async (content: string, senderId: string, senderName: string) => {
      const nextMessage: ChatMessage = {
        _: { soul: `${roomId}-${Date.now()}` },
        created_by: senderId,
        content,
        sender_id: senderId,
        sender_name: senderName,
        timestamp: Date.now(),
        delivered: true,
        read: senderId === 'current_user',
      };
      setMessages((previous) => {
        const next = [...previous, nextMessage];
        setRoomMessages(roomId, next);
        return next;
      });
    },
    [roomId],
  );

  const markAsRead = useCallback(
    async (messageId: string) => {
      setMessages((previous) => {
        const next = previous.map((message) =>
          message._?.soul === messageId ? { ...message, read: true } : message,
        );
        setRoomMessages(roomId, next);
        return next;
      });
    },
    [roomId],
  );

  const markAsDelivered = useCallback(
    async (messageId: string) => {
      setMessages((previous) => {
        const next = previous.map((message) =>
          message._?.soul === messageId
            ? { ...message, delivered: true }
            : message,
        );
        setRoomMessages(roomId, next);
        return next;
      });
    },
    [roomId],
  );

  return {
    messages,
    sendMessage,
    markAsRead,
    markAsDelivered,
  };
}
