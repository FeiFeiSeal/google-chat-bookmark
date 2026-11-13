import {describe, expect, it, vi} from 'vitest';
import {buildBookmarkNavigationUrl, buildGmailNavigationUrl, isGmailUrl, isSupportedChatUrl, navigateBookmarkInTab} from './navigation';

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

describe('bookmark navigation on both hosts', () => {
  it.each([
    ['https://mail.google.com/mail/u/2/?tab=rm#inbox', 'https://mail.google.com/mail/u/2/?tab=rm#chat/space/space_1/thread-2/reply_3'],
    ['https://chat.google.com/', 'https://chat.google.com/app/chat/space_1/topic/thread-2/message/reply_3'],
    ['https://chat.google.com/app/chat/old/topic/old/message/old', 'https://chat.google.com/app/chat/space_1/topic/thread-2/message/reply_3'],
    ['https://chat.google.com/u/2/app/home', 'https://chat.google.com/u/2/app/chat/space_1/topic/thread-2/message/reply_3'],
    ['https://chat.google.com/u/0/#chat/home', 'https://chat.google.com/u/0/#chat/space/space_1/thread-2/reply_3'],
    ['https://chat.google.com/?authuser=3#chat/home', 'https://chat.google.com/?authuser=3#chat/space/space_1/thread-2/reply_3'],
    ['https://chat.google.com/app/home?authuser=3', 'https://chat.google.com/app/chat/space_1/topic/thread-2/message/reply_3?authuser=3'],
  ])('opens the same message using the current tab host and account: %s', (current, expected) => {
    expect(isSupportedChatUrl(current)).toBe(true);
    expect(buildBookmarkNavigationUrl(current, bookmark)).toBe(expected);
  });

  it('uses the in-app message route for standalone direct messages', () => {
    expect(buildBookmarkNavigationUrl('https://chat.google.com/u/1/app/home', {
      conversationType: 'dm', spaceId: 'woI29KAAAAE', threadId: 'thread-2', messageId: 'reply-3',
    })).toBe('https://chat.google.com/u/1/app/chat/woI29KAAAAE/topic/thread-2/message/reply-3');
  });

  it.each([undefined, '', 'invalid', 'http://chat.google.com/', 'https://example.com/', 'https://chat.google.com.evil.example/', 'https://mail.google.com.evil.example/'])('rejects unsupported tabs: %s', (current) => {
    expect(isSupportedChatUrl(current)).toBe(false);
    expect(() => buildBookmarkNavigationUrl(current ?? '', bookmark)).toThrow('invalid-bookmark-navigation');
  });

  it('validates message identity before navigating on either host', () => {
    for (const current of ['https://chat.google.com/', 'https://mail.google.com/mail/u/0/']) {
      expect(() => buildBookmarkNavigationUrl(current, {...bookmark, messageId: '../bad'})).toThrow();
    }
  });
});

describe('navigation transport', () => {
  function tabs(url: string) {
    return {get: vi.fn().mockResolvedValue({url}), update: vi.fn().mockResolvedValue({}), sendMessage: vi.fn().mockResolvedValue(true)};
  }

  it('asks the standalone top frame to navigate without tabs.update', async () => {
    const api = tabs('https://chat.google.com/app/home');
    expect(await navigateBookmarkInTab(api, 7, bookmark)).toBe(true);
    expect(api.sendMessage).toHaveBeenCalledWith(7, {type: 'bookmark.navigate-in-page', bookmark}, {frameId: 0});
    expect(api.update).not.toHaveBeenCalled();
  });

  it('keeps Gmail hash navigation', async () => {
    const api = tabs('https://mail.google.com/mail/u/2/#inbox');
    expect(await navigateBookmarkInTab(api, 7, bookmark)).toBe(true);
    expect(api.update).toHaveBeenCalledWith(7, {url: 'https://mail.google.com/mail/u/2/#chat/space/space_1/thread-2/reply_3', active: true});
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it('reports failure without a document-navigation fallback', async () => {
    const api = tabs('https://chat.google.com/app/home');
    api.sendMessage.mockResolvedValue(false);
    expect(await navigateBookmarkInTab(api, 7, bookmark)).toBe(false);
    api.sendMessage.mockRejectedValue(new Error('missing-receiver'));
    await expect(navigateBookmarkInTab(api, 7, bookmark)).rejects.toThrow('missing-receiver');
    expect(api.update).not.toHaveBeenCalled();
  });
});
