/**
 * Parse download blocks emitted by the LLM.
 * Format: ```download:filename.ext\ncontent\n```
 * The LLM explicitly marks downloadable content with filename and extension.
 */

export interface DownloadBlock {
  filename: string;
  content: string;
}

const DOWNLOAD_REGEX = /```download:([^\n]+)\n([\s\S]*?)\n```/g;
const DOWNLOAD_SINGLE = /```download:([^\n]+)\n([\s\S]*?)\n```/;

/**
 * Extract all download blocks from a message.
 * Returns null if no download blocks found.
 */
export function parseDownloadBlocks(content: string): DownloadBlock[] | null {
  const matches = content.matchAll(DOWNLOAD_REGEX);
  const blocks: DownloadBlock[] = [];

  for (const match of matches) {
    const filename = match[1].trim();
    const fileContent = match[2];
    if (filename && fileContent) {
      blocks.push({ filename, content: fileContent });
    }
  }

  return blocks.length > 0 ? blocks : null;
}

/**
 * Strip all download blocks from content for display.
 * The content inside the block is still shown as a normal code block,
 * but the ```download:filename header is replaced with the language hint.
 */
export function stripDownloadHeaders(content: string): string {
  return content.replace(/```download:(\S+)/g, (_match, filename) => {
    const ext = filename.split('.').pop() || '';
    return '```' + ext;
  });
}

/**
 * Get mime type from filename extension.
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    py: 'text/x-python',
    js: 'text/javascript',
    ts: 'text/typescript',
    java: 'text/x-java',
    md: 'text/markdown',
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
    sh: 'text/x-shellscript',
    sql: 'text/x-sql',
    c: 'text/x-c',
    cpp: 'text/x-c++',
    rs: 'text/x-rust',
    go: 'text/x-go',
    rb: 'text/x-ruby',
    php: 'text/x-php',
    swift: 'text/x-swift',
    kt: 'text/x-kotlin',
  };
  return mimeMap[ext] || 'text/plain';
}
