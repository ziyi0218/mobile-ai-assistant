/**
 * Parse clarification blocks emitted by the LLM in chat messages.
 * Format: ```clarification\n{ "mode": "single"|"multi", "options": [...] }\n```
 * Also supports legacy array-only format for backwards compatibility.
 */

export interface ClarificationOption {
  id: string;
  label: string;
}

export type ClarificationMode = 'single' | 'multi';

export interface ClarificationResult {
  mode: ClarificationMode;
  options: ClarificationOption[];
}

const BLOCK_REGEX = /```clarification\s*\n([\s\S]*?)\n```/;

function parseOptions(raw: unknown[]): ClarificationOption[] {
  if (raw.length === 0) return [];

  // String array shorthand: ["Option A", "Option B"]
  if (typeof raw[0] === 'string') {
    return raw
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s, i) => ({ id: String(i + 1), label: s }));
  }

  // Object array: [{ id, label }]
  return raw
    .filter((o): o is Record<string, unknown> => typeof o === 'object' && o !== null && typeof (o as any).label === 'string')
    .map((o: any) => ({ id: String(o.id ?? ''), label: o.label }));
}

export function parseClarification(content: string): ClarificationResult | null {
  const match = content.match(BLOCK_REGEX);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1].trim());

    // New format: { mode, options }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.options)) {
      const mode: ClarificationMode = parsed.mode === 'multi' ? 'multi' : 'single';
      const options = parseOptions(parsed.options);
      return options.length > 0 ? { mode, options } : null;
    }

    // Legacy format: plain array
    if (Array.isArray(parsed)) {
      const options = parseOptions(parsed);
      return options.length > 0 ? { mode: 'single', options } : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function stripClarificationBlock(content: string): string {
  return content.replace(BLOCK_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
}
