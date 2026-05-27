import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  mediaUrl?: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: number;
}

export interface ChatUser {
  id: string;
  displayName: string;
  photoURL: string;
  isOnline: boolean;
  lastSeen: number;
  status: string;
}

interface ChatState {
  activeChat: string | null;
  setActiveChat: (userId: string | null) => void;
  // Further chat state placeholders
}

export const useChatStore = create<ChatState>((set) => ({
  activeChat: null,
  setActiveChat: (userId) => set({ activeChat: userId }),
}));
