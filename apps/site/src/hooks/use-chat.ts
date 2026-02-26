import { useCallback, useSyncExternalStore } from 'react';

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
const CHAT_STORAGE_PREFIX = 'supersurkhet:chat:room:';
const CHAT_ROOM_UPDATE_EVENT = 'supersurkhet:chat:room:update';

type ChatRoomUpdateDetail = {
  roomId: string;
};

function getStorageKey(roomId: string) {
  return `${CHAT_STORAGE_PREFIX}${roomId}`;
}

function normalizeMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ChatMessage>;
  if (
    typeof raw.created_by !== 'string' ||
    typeof raw.content !== 'string' ||
    typeof raw.sender_id !== 'string' ||
    typeof raw.sender_name !== 'string' ||
    typeof raw.timestamp !== 'number' ||
    typeof raw.delivered !== 'boolean' ||
    typeof raw.read !== 'boolean'
  ) {
    return null;
  }
  return {
    _:
      raw._ && typeof raw._ === 'object' && typeof raw._.soul === 'string'
        ? { soul: raw._.soul }
        : undefined,
    created_by: raw.created_by,
    content: raw.content,
    sender_id: raw.sender_id,
    sender_name: raw.sender_name,
    timestamp: raw.timestamp,
    delivered: raw.delivered,
    read: raw.read,
  };
}

function readRoomMessagesFromStorage(roomId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(getStorageKey(roomId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeMessage(entry))
      .filter((entry): entry is ChatMessage => entry !== null);
  } catch {
    return [];
  }
}

function getRoomMessages(roomId: string): ChatMessage[] {
  const cached = chatRoomStore.get(roomId);
  if (cached) return cached;
  const stored = readRoomMessagesFromStorage(roomId);
  chatRoomStore.set(roomId, stored);
  return stored;
}

function emitRoomUpdate(roomId: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ChatRoomUpdateDetail>(CHAT_ROOM_UPDATE_EVENT, {
      detail: { roomId },
    }),
  );
}

function setRoomMessages(roomId: string, messages: ChatMessage[]) {
  chatRoomStore.set(roomId, messages);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        getStorageKey(roomId),
        JSON.stringify(messages),
      );
    } catch {
      // Ignore storage write failures and keep in-memory behavior.
    }
    emitRoomUpdate(roomId);
  }
}

function subscribeToRoomMessages(roomId: string, onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== getStorageKey(roomId)) return;
    onStoreChange();
  };

  const onRoomUpdate = (event: Event) => {
    const detail = (event as CustomEvent<ChatRoomUpdateDetail>).detail;
    if (detail?.roomId !== roomId) return;
    onStoreChange();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(
    CHAT_ROOM_UPDATE_EVENT,
    onRoomUpdate as EventListener,
  );

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(
      CHAT_ROOM_UPDATE_EVENT,
      onRoomUpdate as EventListener,
    );
  };
}

export function useChat(roomId: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      subscribeToRoomMessages(roomId, onStoreChange),
    [roomId],
  );
  const getSnapshot = useCallback(() => getRoomMessages(roomId), [roomId]);
  const getServerSnapshot = useCallback(() => [] as ChatMessage[], []);
  const messages = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

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
      const next = [...getRoomMessages(roomId), nextMessage];
      setRoomMessages(roomId, next);
    },
    [roomId],
  );

  const markAsRead = useCallback(
    async (messageId: string) => {
      const next = getRoomMessages(roomId).map((message) =>
        message._?.soul === messageId ? { ...message, read: true } : message,
      );
      setRoomMessages(roomId, next);
    },
    [roomId],
  );

  const markAsDelivered = useCallback(
    async (messageId: string) => {
      const next = getRoomMessages(roomId).map((message) =>
        message._?.soul === messageId
          ? { ...message, delivered: true }
          : message,
      );
      setRoomMessages(roomId, next);
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
