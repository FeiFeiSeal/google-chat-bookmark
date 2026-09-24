import {describe, expect, it} from 'vitest';
import {bookmarkStorageKey, buildCanonicalChatUrl, parseCanonicalChatUrl} from './identity';

describe('message identity', () => {
  it('uses space, thread and message for duplicate identity', () => {
    expect(bookmarkStorageKey({spaceId: 'AAA_1', threadId: 'thread-2', messageId: 'reply-3'})).toBe('bookmark:AAA_1:thread-2:reply-3');
  });

  it('round trips root and reply anchors through canonical URLs', () => {
    const root = buildCanonicalChatUrl({spaceId: 'space', threadId: 'thread', messageId: 'thread'});
    const reply = buildCanonicalChatUrl({spaceId: 'space', threadId: 'thread', messageId: 'reply'});
    expect(parseCanonicalChatUrl(root)).toEqual({spaceId: 'space', threadId: 'thread', messageId: 'thread'});
    expect(parseCanonicalChatUrl(reply)).toEqual({spaceId: 'space', threadId: 'thread', messageId: 'reply'});
    expect(bookmarkStorageKey(parseCanonicalChatUrl(root)!)).not.toBe(bookmarkStorageKey(parseCanonicalChatUrl(reply)!));
  });

  it.each([
    'http://chat.google.com/room/a/b/c',
    'https://example.com/room/a/b/c',
    'https://chat.google.com/room/a/b',
    'https://chat.google.com/room/a/b/%3Cscript%3E',
  ])('rejects invalid source %s', (url) => expect(parseCanonicalChatUrl(url)).toBeNull());
});
