/**
 * Parse memory blocks emitted by the LLM when the user asks to memorize something.
 * Format: ```memory\n["fact 1", "fact 2"]\n```
 * or: ```memory\nfact single line\n```
 */

const BLOCK_REGEX = /```memory\s*\n([\s\S]*?)\n```/;

export function parseMemoryBlock(content: string): string[] | null {
  const match = content.match(BLOCK_REGEX);
  if (!match) return null;

  const raw = match[1].trim();
  if (!raw) return null;

  // Try JSON array first
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const facts = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
      return facts.length > 0 ? facts : null;
    }
  } catch {
    // Not JSON — treat as single fact
  }

  // Single line fact
  return raw.length > 0 ? [raw] : null;
}

export function stripMemoryBlock(content: string): string {
  return content.replace(BLOCK_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
}
