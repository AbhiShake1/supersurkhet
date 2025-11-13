import { api } from "@/lib/api";

export function useChat(roomId: string) {
  const { data: messages = [] } = api.chat.useGet({ keys: [roomId] });
  const { mutate: createMessage } = api.chat.useCreate({ keys: [roomId] });
  const { mutate: updateMessage } = api.chat.useUpdate({ keys: [roomId] });

  // Send a new message
  const sendMessage = async (
    content: string,
    senderId: string,
    senderName: string,
  ) => {
    createMessage({
      created_by: senderId,
      content,
      sender_id: senderId,
      sender_name: senderName,
      timestamp: Date.now(),
      delivered: false,
      read: false,
    });
  };

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    await updateMessage({ id: messageId, read: true });
  };

  // Mark message as delivered
  const markAsDelivered = async (messageId: string) => {
    await updateMessage({ id: messageId, delivered: true });
  };

  return {
    messages,
    sendMessage,
    markAsRead,
    markAsDelivered,
  };
}
