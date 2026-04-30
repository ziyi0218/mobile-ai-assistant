import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { chatService } from '../services/chatService';
import type { ChatData } from '../types/api';
import { getDisplayText } from './messageHelpers';

export type ChatExportFormat = 'json' | 'txt' | 'pdf';
export type ChatExportResult = {
  uri: string;
  sharingAvailable: boolean;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://pleiade.mi.parisdescartes.fr/api/v1';
const WEB_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFilenamePart(value: string) {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'chat';
}

function getMessageText(content: unknown) {
  if (typeof content === 'string' || Array.isArray(content)) {
    return getDisplayText(content);
  }
  return String(content ?? '');
}

function closeList(listType: 'ul' | 'ol' | null) {
  return listType ? `</${listType}>` : '';
}

function renderMessageHtml(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let listType: 'ul' | 'ol' | null = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      html += closeList(listType);
      listType = null;
      html += '<div class="spacer"></div>';
      return;
    }

    const ordered = line.match(/^(\d+)\.\s+(.*)$/);
    const unordered = line.match(/^[-*]\s+(.*)$/);

    if (ordered) {
      if (listType !== 'ol') {
        html += closeList(listType);
        html += '<ol>';
        listType = 'ol';
      }
      html += `<li>${escapeHtml(ordered[2] ?? '')}</li>`;
      return;
    }

    if (unordered) {
      if (listType !== 'ul') {
        html += closeList(listType);
        html += '<ul>';
        listType = 'ul';
      }
      html += `<li>${escapeHtml(unordered[1] ?? '')}</li>`;
      return;
    }

    html += closeList(listType);
    listType = null;

    if (line.startsWith('### ')) {
      html += `<h3>${escapeHtml(line.slice(4))}</h3>`;
      return;
    }

    if (line.startsWith('## ')) {
      html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
      return;
    }

    if (line.startsWith('# ')) {
      html += `<h1>${escapeHtml(line.slice(2))}</h1>`;
      return;
    }

    html += `<p>${escapeHtml(line)}</p>`;
  });

  html += closeList(listType);
  return html;
}

function buildPdfHtml(chat: ChatData) {
  const title = String(chat.title || 'Chat').trim() || 'Chat';
  const messages = Array.isArray(chat.chat?.messages) ? chat.chat.messages : [];
  const body = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => {
      if (message.role === 'user') {
        return `
          <section class="message user">
            <div class="bubble">${renderMessageHtml(getMessageText(message.content))}</div>
          </section>
        `;
      }

      return `
        <section class="message assistant">
          <div class="model">${escapeHtml(message.modelName || message.model || 'assistant')}</div>
          <div class="content">${renderMessageHtml(getMessageText(message.content))}</div>
        </section>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          :root {
            color-scheme: light;
          }
          * {
            color: inherit;
          }
          body {
            margin: 0;
            padding: 32px 28px 48px;
            background: #ffffff;
            color: #111827;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.55;
          }
          .page {
            max-width: 860px;
            margin: 0 auto;
          }
          .title {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 28px;
          }
          .message {
            margin-bottom: 28px;
          }
          .user {
            display: flex;
            justify-content: flex-end;
          }
          .bubble {
            max-width: 72%;
            background: #f3f4f6;
            color: #111827;
            border-radius: 18px;
            padding: 12px 18px;
          }
          .model {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          .content p,
          .bubble p {
            margin: 0 0 12px;
            font-size: 15px;
          }
          .content h1,
          .content h2,
          .content h3,
          .bubble h1,
          .bubble h2,
          .bubble h3 {
            margin: 0 0 12px;
            font-weight: 800;
          }
          .content h1,
          .bubble h1 {
            font-size: 28px;
          }
          .content h2,
          .bubble h2 {
            font-size: 24px;
          }
          .content h3,
          .bubble h3 {
            font-size: 20px;
          }
          .content ol,
          .content ul,
          .bubble ol,
          .bubble ul {
            margin: 0 0 12px 24px;
            padding: 0;
          }
          .content li,
          .bubble li {
            margin-bottom: 8px;
            font-size: 15px;
          }
          code {
            background: #f3f4f6;
            border-radius: 5px;
            padding: 2px 5px;
          }
          pre {
            background: #f3f4f6;
            border-radius: 10px;
            padding: 12px;
            white-space: pre-wrap;
          }
          .spacer {
            height: 8px;
          }
        </style>
      </head>
      <body>
        <main class="page">
          <h1 class="title">${escapeHtml(title)}</h1>
          ${body}
        </main>
      </body>
    </html>
  `;
}

function buildChatTextTranscript(chat: ChatData) {
  const messages = Array.isArray(chat.chat?.messages) ? chat.chat.messages : [];
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => `### ${message.role.toUpperCase()}\n${getMessageText(message.content).trim()}`)
    .join('\n\n')
    .trim();
}

function buildShareUrl(shareId: string) {
  return `${WEB_BASE_URL}/s/${shareId}`;
}

function buildCloneTitle(title: string, language = 'en') {
  if (language.startsWith('zh')) return `${title} \u7684\u526f\u672c`;
  if (language.startsWith('fr')) return `Copie de ${title}`;
  return `Clone of ${title}`;
}

async function shareFile(uri: string, mimeType: string, dialogTitle: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error(`Export file was not created: ${uri}`);
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle,
      UTI:
        mimeType === 'application/json'
          ? 'public.json'
          : mimeType === 'text/plain'
            ? 'public.plain-text'
            : mimeType === 'application/pdf'
              ? 'com.adobe.pdf'
              : undefined,
    });
  }

  return { uri, sharingAvailable };
}

async function copyPdfWithFilename(sourceUri: string, filename: string) {
  const destinationUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.deleteAsync(destinationUri, { idempotent: true });
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destinationUri,
  });
  return destinationUri;
}

export async function cloneChat(chatId: string, language = 'en') {
  const chat = await chatService.getChatDetails(chatId);
  const baseTitle = String(chat.title || 'Untitled chat').trim() || 'Untitled chat';
  const title = buildCloneTitle(baseTitle, language);
  return chatService.cloneChat(chatId, title);
}

export async function exportSingleChat(chatId: string, format: ChatExportFormat): Promise<ChatExportResult> {
  const chat = await chatService.getChatDetails(chatId);
  const safeTitle = sanitizeFilenamePart(chat.title || 'chat');

  if (format === 'json') {
    const filename = `chat-export-${Date.now()}.json`;
    const uri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify([chat], null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return shareFile(uri, 'application/json', 'Export chat (.json)');
  }

  if (format === 'txt') {
    const filename = `chat-${safeTitle}.txt`;
    const uri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, buildChatTextTranscript(chat), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return shareFile(uri, 'text/plain', 'Export chat (.txt)');
  }

  const result = await Print.printToFileAsync({
    html: buildPdfHtml(chat),
  });
  const uri = await copyPdfWithFilename(result.uri, `chat-${safeTitle}.pdf`);
  return shareFile(uri, 'application/pdf', 'Export chat (.pdf)');
}

export async function ensureShareLink(chatId: string) {
  const chat = await chatService.getChatDetails(chatId);
  const existingShareId = chat.share_id;

  if (existingShareId) {
    const url = buildShareUrl(existingShareId);
    await Clipboard.setStringAsync(url);
    return { url, shareId: existingShareId, reused: true };
  }

  const shared = await chatService.createShareLink(chatId);
  const shareId = shared.share_id || shared.id;
  const url = buildShareUrl(shareId);
  await Clipboard.setStringAsync(url);
  return { url, shareId, reused: false };
}

export async function removeShareLink(chatId: string) {
  return chatService.deleteShareLink(chatId);
}

export async function openCommunitySharePage() {
  await Linking.openURL('https://openwebui.com/post?type=chat');
}

export async function exportFolderAsJson(folderId: string, folderName: string): Promise<ChatExportResult> {
  const chats = await chatService.exportFolder(folderId);
  const safeFolderName = sanitizeFilenamePart(folderName || 'folder');
  const uri = `${FileSystem.documentDirectory}folder-${safeFolderName}-export-${Date.now()}.json`;

  await FileSystem.writeAsStringAsync(uri, JSON.stringify(chats, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return shareFile(uri, 'application/json', 'Export folder (.json)');
}

export const chatActions = {
  buildCloneTitle,
  buildShareUrl,
  buildChatTextTranscript,
  buildPdfHtml,
};
