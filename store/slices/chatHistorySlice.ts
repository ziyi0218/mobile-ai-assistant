/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { chatService } from '../../services/chatService';
import type { ChatFolder, ChatSummary } from '../../types/api';

export interface ChatHistorySlice {
  history: ChatSummary[];
  pinnedChats: ChatSummary[];
  archivedChats: ChatSummary[];
  folders: ChatFolder[];
  fetchHistory: () => Promise<void>;
  fetchPinnedChats: () => Promise<void>;
  fetchFolders: () => Promise<void>;
  refreshSidebarData: () => Promise<void>;
  fetchArchivedChats: () => Promise<void>;
  toggleArchiveChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  moveChatToFolder: (chatId: string, folderId: string | null) => Promise<void>;
  togglePinChat: (chatId: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  renameFolder: (folderId: string, name: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  archiveAllChats: () => Promise<void>;
  unarchiveAllChats: () => Promise<void>;
  deleteAllChats: () => Promise<void>;
}

export const createChatHistorySlice = (set: any, get: any): ChatHistorySlice => ({
  history: [],
  pinnedChats: [],
  archivedChats: [],
  folders: [],

  fetchHistory: async () => {
    try {
      const data = await chatService.getHistory(1);
      const list = Array.isArray(data) ? data : [];
      set({ history: list });
    } catch (error) {
      console.error('Erreur historique:', error);
    }
  },

  fetchPinnedChats: async () => {
    try {
      const data = await chatService.getPinnedChats();
      const list = Array.isArray(data) ? data : [];
      set({ pinnedChats: list });
    } catch (error) {
      console.error('Erreur pinned chats:', error);
    }
  },

  fetchFolders: async () => {
    try {
      const data = await chatService.getFolders();
      const list = (Array.isArray(data) ? data : []).map((folder) => ({
        ...folder,
        expanded: folder.is_expanded ?? false,
      }));
      set({ folders: list });
    } catch (error) {
      console.error('Erreur folders:', error);
    }
  },

  refreshSidebarData: async () => {
    await Promise.all([
      get().fetchHistory(),
      get().fetchPinnedChats(),
      get().fetchFolders(),
    ]);
  },

  fetchArchivedChats: async () => {
    try {
      const data = await chatService.getArchivedChats(1);
      const list = Array.isArray(data) ? data : [];
      set({ archivedChats: list });
    } catch (error) {
      console.error('Erreur archived chats:', error);
    }
  },

  toggleArchiveChat: async (chatId: string) => {
    try {
      await chatService.toggleArchiveChat(chatId);
      await get().fetchArchivedChats();
      await get().refreshSidebarData();
    } catch (error) {
      console.error('Erreur toggle archive:', error);
    }
  },

  renameChat: async (chatId: string, title: string) => {
    try {
      await chatService.renameChat(chatId, title);
      await get().refreshSidebarData();
    } catch (error) {
      console.error('Erreur rename chat:', error);
    }
  },

  moveChatToFolder: async (chatId: string, folderId: string | null) => {
    try {
      await chatService.moveChatToFolder(chatId, folderId);
      await get().refreshSidebarData();
    } catch (error) {
      console.error('Erreur move chat to folder:', error);
    }
  },

  togglePinChat: async (chatId: string) => {
    try {
      await chatService.togglePinChat(chatId);
      await get().refreshSidebarData();
    } catch (error) {
      console.error('Erreur toggle pin chat:', error);
    }
  },

  createFolder: async (name: string) => {
    try {
      await chatService.createFolder(name);
      await get().refreshSidebarData();
    } catch (error) {
      console.error('Erreur create folder:', error);
    }
  },

  renameFolder: async (folderId: string, name: string) => {
    try {
      const folder = get().folders.find((item: ChatFolder) => item.id === folderId);
      await chatService.updateFolder(folderId, {
        name,
        meta: folder?.meta ?? null,
        data: folder?.data ?? null,
      });
      await get().fetchFolders();
    } catch (error) {
      console.error('Erreur rename folder:', error);
    }
  },

  deleteFolder: async (folderId: string) => {
    try {
      await chatService.deleteFolder(folderId);
      await get().refreshSidebarData();
    } catch (error) {
      console.error('Erreur delete folder:', error);
    }
  },

  deleteChat: async (chatId: string) => {
    try {
      await chatService.deleteChat(chatId);
      await get().fetchArchivedChats();
      await get().refreshSidebarData();
    } catch (error) {
      console.error("Erreur delete chat:", error);
    }
  },

  archiveAllChats: async () => {
    try {
      await chatService.archiveAllChats();
      await get().refreshSidebarData();
      await get().fetchArchivedChats();
    } catch (error) {
      console.error("Erreur archive all chats:", error);
    }
  },

  unarchiveAllChats: async () => {
    try {
      await chatService.unarchiveAllChats();
      await get().refreshSidebarData();
      await get().fetchArchivedChats();
    } catch (error) {
      console.error("Erreur unarchive all chats:", error);
    }
  },

  deleteAllChats: async () => {
    try {
      await chatService.deleteAllChats();
      await get().refreshSidebarData();
      await get().fetchArchivedChats();
    } catch (error) {
      console.error("Erreur delete all chats:", error);
    }
  },
});
