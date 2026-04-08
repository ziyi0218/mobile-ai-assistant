jest.mock('../../services/chatService', () => ({
  chatService: {
    getChatDetails: jest.fn(),
    cloneChat: jest.fn(),
    createShareLink: jest.fn(),
    deleteShareLink: jest.fn(),
    exportFolder: jest.fn(),
  },
}));

import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { chatService } from '../../services/chatService';
import {
  chatActions,
  cloneChat,
  ensureShareLink,
  exportFolderAsJson,
  exportSingleChat,
  openCommunitySharePage,
  removeShareLink,
} from '../../utils/chatActions';

const mockChatService = chatService as jest.Mocked<typeof chatService>;

const sampleChat = {
  id: 'chat-1',
  title: 'Ancient Roman Concrete',
  share_id: null,
  chat: {
    messages: [
      { id: 'u1', role: 'user', content: 'Tell me a fun fact', timestamp: 1, parentId: null, childrenIds: ['a1'] },
      {
        id: 'a1',
        role: 'assistant',
        content: '### Answer\n- First point\n- Second point',
        timestamp: 1,
        parentId: 'u1',
        childrenIds: [],
        model: 'athene-v2:latest',
        modelName: 'athene-v2:latest',
      },
    ],
  },
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockChatService.getChatDetails.mockResolvedValue(sampleChat);
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
});

describe('chatActions', () => {
  it('builds a plain text transcript', () => {
    expect(chatActions.buildChatTextTranscript(sampleChat)).toBe(
      '### USER\nTell me a fun fact\n\n### ASSISTANT\n### Answer\n- First point\n- Second point'
    );
  });

  it('builds localized clone titles', () => {
    expect(chatActions.buildCloneTitle('Chat', 'en')).toBe('Clone of Chat');
    expect(chatActions.buildCloneTitle('聊天', 'zh-CN')).toBe('聊天 的副本');
    expect(chatActions.buildCloneTitle('Chat', 'fr-FR')).toBe('Copie de Chat');
  });

  it('clones a chat with a derived title', async () => {
    mockChatService.cloneChat.mockResolvedValue({ id: 'clone-1' } as any);

    const result = await cloneChat('chat-1', 'en');
    expect(mockChatService.cloneChat).toHaveBeenCalledWith('chat-1', 'Clone of Ancient Roman Concrete');
    expect(result).toEqual({ id: 'clone-1' });
  });

  it('exports a single chat as json', async () => {
    await exportSingleChat('chat-1', 'json');

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('chat-export-'),
      JSON.stringify([sampleChat], null, 2),
      expect.objectContaining({ encoding: FileSystem.EncodingType.UTF8 })
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      expect.stringContaining('.json'),
      expect.objectContaining({ mimeType: 'application/json' })
    );
  });

  it('exports a single chat as txt', async () => {
    await exportSingleChat('chat-1', 'txt');

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('chat-Ancient Roman Concrete.txt'),
      '### USER\nTell me a fun fact\n\n### ASSISTANT\n### Answer\n- First point\n- Second point',
      expect.objectContaining({ encoding: FileSystem.EncodingType.UTF8 })
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      expect.stringContaining('.txt'),
      expect.objectContaining({ mimeType: 'text/plain' })
    );
  });

  it('exports a single chat as pdf', async () => {
    const Print = require('expo-print');

    await exportSingleChat('chat-1', 'pdf');

    expect(Print.printToFileAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      '/mock/documents/chat.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' })
    );
  });

  it('reuses an existing share link', async () => {
    mockChatService.getChatDetails.mockResolvedValue({ ...sampleChat, share_id: 'share-1' } as any);

    const result = await ensureShareLink('chat-1');
    expect(mockChatService.createShareLink).not.toHaveBeenCalled();
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      'https://pleiade.mi.parisdescartes.fr/s/share-1'
    );
    expect(result).toEqual({
      url: 'https://pleiade.mi.parisdescartes.fr/s/share-1',
      shareId: 'share-1',
      reused: true,
    });
  });

  it('creates a share link when none exists', async () => {
    mockChatService.createShareLink.mockResolvedValue({ id: 'share-2' } as any);

    const result = await ensureShareLink('chat-1');
    expect(mockChatService.createShareLink).toHaveBeenCalledWith('chat-1');
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      'https://pleiade.mi.parisdescartes.fr/s/share-2'
    );
    expect(result.shareId).toBe('share-2');
    expect(result.reused).toBe(false);
  });

  it('deletes a share link', async () => {
    mockChatService.deleteShareLink.mockResolvedValue(true as any);

    await removeShareLink('chat-1');
    expect(mockChatService.deleteShareLink).toHaveBeenCalledWith('chat-1');
  });

  it('opens the Open WebUI community page', async () => {
    await openCommunitySharePage();
    expect(Linking.openURL).toHaveBeenCalledWith('https://openwebui.com/post?type=chat');
  });

  it('exports a folder as json', async () => {
    mockChatService.exportFolder.mockResolvedValue([{ id: 'c1' }] as any);

    await exportFolderAsJson('folder-1', 'Math');
    expect(mockChatService.exportFolder).toHaveBeenCalledWith('folder-1');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('folder-Math-export-'),
      JSON.stringify([{ id: 'c1' }], null, 2),
      expect.objectContaining({ encoding: FileSystem.EncodingType.UTF8 })
    );
  });
});
