import {describe, expect, it} from 'vitest';
import {buildGmailNavigationUrl, isGmailUrl} from './navigation';

const bookmark = {spaceId: 'space_1', threadId: 'thread-2', messageId: 'reply_3'};

describe('Gmail navigation adapter', () => {
  it.each([
    ['https://mail.google.com/mail/u/2/#inbox', 'https://mail.google.com/mail/u/2/#chat/space/space_1/thread-2/reply_3'],
    ['https://mail.google.com/mail/u/7/#chat/home', 'https://mail.google.com/mail/u/7/#chat/space/space_1/thread-2/reply_3'],
  ])('preserves the current account pathname', (current, expected) => expect(buildGmailNavigationUrl(current, bookmark)).toBe(expected));
  it('rejects non-Gmail and does not need an account field on bookmark', () => {
    expect(isGmailUrl('https://mail.google.com/mail/u/0/')).toBe(true);
    expect(isGmailUrl('https://example.com/')).toBe(false);
    expect(() => buildGmailNavigationUrl('https://example.com/', bookmark)).toThrow();
    expect(bookmark).not.toHaveProperty('accountIndex');
  });

  it('uses the dm route for a direct-message bookmark', () => {
    expect(buildGmailNavigationUrl('https://mail.google.com/mail/u/0/#chat/home', {
      conversationType: 'dm', spaceId: 'woI29KAAAAE', threadId: 'thread-2', messageId: 'reply-3',
    })).toBe('https://mail.google.com/mail/u/0/#chat/dm/woI29KAAAAE/thread-2/reply-3');
  });
});
