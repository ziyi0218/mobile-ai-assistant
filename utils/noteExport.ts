import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { NoteItem } from '../store/useNoteStore';

export type NoteExportFormat = 'txt' | 'md' | 'pdf';

type NoteExportResult = {
  uri: string;
  sharingAvailable: boolean;
};

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
  return cleaned || 'note';
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getPlainText(note: NoteItem) {
  return (note.content?.trim() || stripHtml(note.contentHtml || '')).trim();
}

function buildTextExport(note: NoteItem) {
  const body = getPlainText(note);
  return [`# ${note.title || 'Untitled note'}`, '', body].join('\n').trim() + '\n';
}

function buildMarkdownExport(note: NoteItem) {
  const body = note.content?.trim() || getPlainText(note);
  return [`# ${note.title || 'Untitled note'}`, '', body].join('\n').trim() + '\n';
}

function renderPlainTextAsHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function buildPdfHtml(note: NoteItem) {
  const title = note.title || 'Untitled note';
  const bodyHtml = note.contentHtml?.trim() || renderPlainTextAsHtml(getPlainText(note));
  const updatedAt = Number.isFinite(note.updatedAt)
    ? new Date(note.updatedAt).toLocaleString()
    : '';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        padding: 36px 32px 48px;
        color: #111827;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.6;
      }
      .title {
        font-size: 30px;
        font-weight: 800;
        margin: 0 0 8px;
      }
      .meta {
        color: #6B7280;
        font-size: 13px;
        margin-bottom: 28px;
      }
      .content {
        font-size: 15px;
      }
      .content p,
      .content ul,
      .content ol,
      .content blockquote,
      .content pre {
        margin: 0 0 14px;
      }
      .content h1,
      .content h2,
      .content h3 {
        margin: 20px 0 12px;
        line-height: 1.25;
      }
      .content pre {
        background: #F3F4F6;
        border-radius: 10px;
        padding: 12px;
        white-space: pre-wrap;
      }
      .content code {
        background: #F3F4F6;
        border-radius: 5px;
        padding: 2px 5px;
      }
    </style>
  </head>
  <body>
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml([updatedAt, note.author].filter(Boolean).join(' - '))}</div>
    <main class="content">${bodyHtml}</main>
  </body>
</html>`;
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
        mimeType === 'text/markdown'
          ? 'net.daringfireball.markdown'
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

export async function exportNote(note: NoteItem, format: NoteExportFormat): Promise<NoteExportResult> {
  const safeTitle = sanitizeFilenamePart(note.title || 'note');

  if (format === 'txt') {
    const uri = `${FileSystem.documentDirectory}note-${safeTitle}.txt`;
    await FileSystem.writeAsStringAsync(uri, buildTextExport(note), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return shareFile(uri, 'text/plain', 'Export note (.txt)');
  }

  if (format === 'md') {
    const uri = `${FileSystem.documentDirectory}note-${safeTitle}.md`;
    await FileSystem.writeAsStringAsync(uri, buildMarkdownExport(note), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return shareFile(uri, 'text/markdown', 'Export note (.md)');
  }

  const result = await Print.printToFileAsync({
    html: buildPdfHtml(note),
  });
  const uri = await copyPdfWithFilename(result.uri, `note-${safeTitle}.pdf`);
  return shareFile(uri, 'application/pdf', 'Export note (.pdf)');
}
