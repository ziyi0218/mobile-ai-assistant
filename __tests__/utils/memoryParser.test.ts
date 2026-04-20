import { parseMemoryBlock, stripMemoryBlock } from '../../utils/memoryParser';

describe('parseMemoryBlock', () => {
  it('parses JSON array of facts', () => {
    const input = 'Ok je retiens.\n```memory\n["Il prefere Python", "Il est en L3"]\n```';
    expect(parseMemoryBlock(input)).toEqual(['Il prefere Python', 'Il est en L3']);
  });

  it('parses single line fact', () => {
    const input = '```memory\nL\'utilisateur prefere le francais\n```';
    expect(parseMemoryBlock(input)).toEqual(["L'utilisateur prefere le francais"]);
  });

  it('returns null when no memory block', () => {
    expect(parseMemoryBlock('Message normal')).toBeNull();
  });

  it('returns null for empty block', () => {
    expect(parseMemoryBlock('```memory\n\n```')).toBeNull();
  });

  it('returns null for empty JSON array', () => {
    expect(parseMemoryBlock('```memory\n[]\n```')).toBeNull();
  });

  it('filters out empty strings in array', () => {
    const input = '```memory\n["Fait valide", "", "  "]\n```';
    expect(parseMemoryBlock(input)).toEqual(['Fait valide']);
  });
});

describe('stripMemoryBlock', () => {
  it('removes memory block from content', () => {
    const input = 'Compris, je memorise.\n```memory\n["fait"]\n```\nAutre texte.';
    const result = stripMemoryBlock(input);
    expect(result).toContain('Compris');
    expect(result).toContain('Autre texte');
    expect(result).not.toContain('memory');
  });

  it('returns content unchanged when no block', () => {
    expect(stripMemoryBlock('Message normal')).toBe('Message normal');
  });
});
