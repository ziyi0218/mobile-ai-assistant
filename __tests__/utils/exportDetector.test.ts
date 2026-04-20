import { parseDownloadBlocks, stripDownloadHeaders, getMimeType } from '../../utils/exportDetector';

describe('parseDownloadBlocks', () => {
  it('parses a single download block', () => {
    const input = 'Voici le script:\n```download:fibonacci.py\ndef fib(n):\n    return n\n```\nBonne chance!';
    const result = parseDownloadBlocks(input);
    expect(result).toEqual([
      { filename: 'fibonacci.py', content: 'def fib(n):\n    return n' },
    ]);
  });

  it('parses multiple download blocks', () => {
    const input = '```download:main.py\nprint("hello")\n```\nEt aussi:\n```download:readme.md\n# Title\n```';
    const result = parseDownloadBlocks(input);
    expect(result).toHaveLength(2);
    expect(result![0].filename).toBe('main.py');
    expect(result![1].filename).toBe('readme.md');
  });

  it('returns null when no download blocks', () => {
    expect(parseDownloadBlocks('Message normal sans bloc')).toBeNull();
  });

  it('returns null for regular code blocks', () => {
    expect(parseDownloadBlocks('```python\nprint("hi")\n```')).toBeNull();
  });

  it('handles filenames with dashes and dots', () => {
    const input = '```download:my-report-v2.txt\ncontent here\n```';
    const result = parseDownloadBlocks(input);
    expect(result![0].filename).toBe('my-report-v2.txt');
  });
});

describe('stripDownloadHeaders', () => {
  it('replaces download:filename with language hint', () => {
    const input = '```download:script.py\ncode\n```';
    const result = stripDownloadHeaders(input);
    expect(result).toBe('```py\ncode\n```');
    expect(result).not.toContain('download');
  });

  it('handles .md extension', () => {
    const result = stripDownloadHeaders('```download:notes.md\n# Title\n```');
    expect(result).toBe('```md\n# Title\n```');
  });

  it('returns content unchanged when no download blocks', () => {
    expect(stripDownloadHeaders('normal text')).toBe('normal text');
  });
});

describe('getMimeType', () => {
  it('returns correct mime for python', () => {
    expect(getMimeType('script.py')).toBe('text/x-python');
  });

  it('returns correct mime for markdown', () => {
    expect(getMimeType('doc.md')).toBe('text/markdown');
  });

  it('returns correct mime for json', () => {
    expect(getMimeType('data.json')).toBe('application/json');
  });

  it('returns text/plain for unknown extensions', () => {
    expect(getMimeType('file.xyz')).toBe('text/plain');
  });
});
