import { useCreate, useGet, useUpdate } from "../index";
import type { ChatMessage } from "../../schema";

export function useChat(roomId: string) {
	const messages = useGet("chat.message", roomId);
	const createMessage = useCreate("chat.message", roomId);
	const updateMessage = useUpdate("chat.message", roomId);

	// Send a new message
	const sendMessage = async (
		content: string,
		senderId: string,
		senderName: string,
	) => {
		await createMessage({
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
		await updateMessage(messageId, { read: true });
	};

	// Mark message as delivered
	const markAsDelivered = async (messageId: string) => {
		await updateMessage(messageId, { delivered: true });
	};

	return {
		messages,
		sendMessage,
		markAsRead,
		markAsDelivered,
	};
}

export function useChatRooms() {
	const rooms = useGet("chat.room", "userId");
	const createRoom = useCreate("chat.room", "userId");
	const updateRoom = useUpdate("chat.room", "userId");

	// Create a new chat room
	const createChatRoom = async (name: string, participants: string[]) => {
		await createRoom({
			name,
			participants,
			created_at: Date.now(),
			updated_at: Date.now(),
			last_message: null,
			created_by: "userId",
			timestamp: Date.now(),
		});
	};

	// Update room's last message
	const updateLastMessage = async (roomId: string, message: ChatMessage) => {
		await updateRoom(roomId, {
			last_message: message,
			updated_at: Date.now(),
		});
	};

	return {
		rooms,
		createChatRoom,
		updateLastMessage,
	};
}
