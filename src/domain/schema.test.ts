import {describe, expect, it} from 'vitest';
import {UNCATEGORIZED_CATEGORY, validateBookmark, validateLibraryData} from './schema';

const validBookmark = {
  schemaVersion: 1 as const,
  spaceId: 'space', threadId: 'thread', messageId: 'message',
  url: 'https://chat.google.com/room/space/thread/message?cls=10',
  title: '標題', sourceRoomName: '聊天室', categoryId: 'uncategorized' as const,
  note: '', pinned: false, createdAt: '2026-09-22T00:00:00.000Z', updatedAt: '2026-09-22T00:00:00.000Z',
};

describe('domain schema v3', () => {
  it('defines Uncategorized and validates a complete library', () => {
    expect(UNCATEGORIZED_CATEGORY.id).toBe('uncategorized');
    expect(validateBookmark(validBookmark)).toEqual(validBookmark);
    expect(validateLibraryData({metadata: {schemaVersion: 3, revision: 0, categoryOrder: ['uncategorized'], pinnedOrder: []}, categories: [UNCATEGORIZED_CATEGORY], bookmarks: [validBookmark], orders: {uncategorized: ['bookmark:space:thread:message']}}).ok).toBe(true);
  });

  it.each([
    {...validBookmark, title: undefined},
    {...validBookmark, pinned: 'false'},
    {...validBookmark, title: '<script>alert(1)</script>'},
    {...validBookmark, url: 'javascript:alert(1)'},
  ])('rejects missing, mistyped, or unsafe bookmark fields', (value) => expect(() => validateBookmark(value)).toThrow());

  it('validates optional last-opened time and metadata revision', () => {
    expect(validateBookmark({...validBookmark, lastOpenedAt: '2026-09-23T00:00:00.000Z'}).lastOpenedAt).toBe('2026-09-23T00:00:00.000Z');
    expect(() => validateBookmark({...validBookmark, lastOpenedAt: 'yesterday'})).toThrow('invalid-bookmark-time');
    expect(validateLibraryData({metadata: {schemaVersion: 3, revision: -1, categoryOrder: ['uncategorized'], pinnedOrder: []}, categories: [UNCATEGORIZED_CATEGORY], bookmarks: [], orders: {uncategorized: []}}).ok).toBe(false);
  });
});
