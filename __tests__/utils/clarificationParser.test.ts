import { parseClarification, stripClarificationBlock } from '../../utils/clarificationParser';

describe('parseClarification', () => {
  it('parses valid clarification block with new format (single)', () => {
    const input = 'Texte\n```clarification\n{"mode":"single","options":[{"id":"a","label":"Math"},{"id":"b","label":"Info"}]}\n```';
    const result = parseClarification(input);
    expect(result).toEqual({
      mode: 'single',
      options: [{ id: 'a', label: 'Math' }, { id: 'b', label: 'Info' }],
    });
  });

  it('parses multi mode', () => {
    const input = '```clarification\n{"mode":"multi","options":[{"id":"a","label":"A"},{"id":"b","label":"B"}]}\n```';
    const result = parseClarification(input);
    expect(result).toEqual({
      mode: 'multi',
      options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    });
  });

  it('defaults to single mode when mode missing in object format', () => {
    const input = '```clarification\n{"options":[{"id":"a","label":"X"}]}\n```';
    const result = parseClarification(input);
    expect(result?.mode).toBe('single');
  });

  it('parses legacy array format as single mode', () => {
    const input = '```clarification\n[{"id":"a","label":"Math"},{"id":"b","label":"Info"}]\n```\nTexte';
    const result = parseClarification(input);
    expect(result).toEqual({
      mode: 'single',
      options: [{ id: 'a', label: 'Math' }, { id: 'b', label: 'Info' }],
    });
  });

  it('returns null when no clarification block', () => {
    expect(parseClarification('Message normal sans bloc')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseClarification('```clarification\n[invalide json\n```')).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(parseClarification('```clarification\n[]\n```')).toBeNull();
  });

  it('returns null for empty options in object format', () => {
    expect(parseClarification('```clarification\n{"mode":"single","options":[]}\n```')).toBeNull();
  });

  it('returns null when options lack label', () => {
    expect(parseClarification('```clarification\n[{"id":"a"}]\n```')).toBeNull();
  });

  it('filters out invalid options and returns valid ones', () => {
    const input = '```clarification\n[{"id":"a","label":"Ok"},{"id":"b"}]\n```';
    const result = parseClarification(input);
    expect(result).toEqual({ mode: 'single', options: [{ id: 'a', label: 'Ok' }] });
  });

  it('handles string array shorthand as single mode', () => {
    const input = '```clarification\n["Option A","Option B","Option C"]\n```';
    const result = parseClarification(input);
    expect(result).toEqual({
      mode: 'single',
      options: [
        { id: '1', label: 'Option A' },
        { id: '2', label: 'Option B' },
        { id: '3', label: 'Option C' },
      ],
    });
  });
});

describe('stripClarificationBlock', () => {
  it('removes clarification block from content', () => {
    const input = 'Texte avant\n```clarification\n{"mode":"single","options":[{"id":"a","label":"X"}]}\n```\nTexte apres';
    const result = stripClarificationBlock(input);
    expect(result).toContain('Texte avant');
    expect(result).toContain('Texte apres');
    expect(result).not.toContain('clarification');
  });

  it('returns content unchanged when no block', () => {
    expect(stripClarificationBlock('Message normal')).toBe('Message normal');
  });

  it('trims extra whitespace after removal', () => {
    const input = 'Avant\n\n```clarification\n[]\n```\n\nApres';
    const result = stripClarificationBlock(input);
    expect(result).not.toContain('\n\n\n');
  });
});
