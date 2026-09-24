import {describe, expect, it} from 'vitest';
import {createDefaultTitle, truncateGraphemes} from './title';

describe('bookmark title', () => {
  it('uses only the first non-empty message line', () => {
    expect(createDefaultTitle({messageText: '  第一行  \n第二行', date: new Date(2026, 8, 22)})).toBe('第一行');
  });

  it('does not split emoji or combining characters', () => {
    expect(truncateGraphemes('👨‍👩‍👧‍👦'.repeat(31), 30)).toBe('👨‍👩‍👧‍👦'.repeat(30));
    expect(truncateGraphemes('e\u0301'.repeat(31), 30)).toBe('e\u0301'.repeat(30));
  });

  it('creates a dated fallback capped at 30 graphemes', () => {
    expect(createDefaultTitle({messageText: '', date: new Date(2026, 8, 22)})).toBe('Bookmark · 2026/09/22');
    expect(Array.from(createDefaultTitle({date: new Date(2026, 8, 22)})).length).toBeLessThanOrEqual(30);
  });
});
