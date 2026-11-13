import {describe, expect, it, vi} from 'vitest';
import {navigateWithinChat} from './navigation';

const bookmark = {spaceId: 'space', threadId: 'thread', messageId: 'reply'};

function pageAt(href: string): Window {
  const location = new URL(href);
  const page = {
    location,
    history: {pushState: vi.fn()},
    dispatchEvent: vi.fn(),
  };
  return Object.assign(page, {top: page}) as unknown as Window;
}

describe('standalone in-page navigation', () => {
  it('updates browser history and notifies the router without replacing the document', () => {
    const page = pageAt('https://chat.google.com/app/home');
    expect(navigateWithinChat(bookmark, page)).toBe(true);
    expect(page.history.pushState).toHaveBeenCalledWith(null, '', 'https://chat.google.com/app/chat/space/topic/thread/message/reply');
    expect(page.dispatchEvent).toHaveBeenCalledWith(expect.any(PopStateEvent));
    expect(page.location.href).toBe('https://chat.google.com/app/home');
  });

  it('uses a hash change for the legacy Chat router', () => {
    const page = pageAt('https://chat.google.com/u/1/?authuser=1#chat/home');
    expect(navigateWithinChat(bookmark, page)).toBe(true);
    expect(page.location.href).toBe('https://chat.google.com/u/1/?authuser=1#chat/space/space/thread/reply');
    expect(page.history.pushState).not.toHaveBeenCalled();
  });

  it('does nothing for an already selected anchor', () => {
    const page = pageAt('https://chat.google.com/app/chat/space/topic/thread/message/reply');
    expect(navigateWithinChat(bookmark, page)).toBe(true);
    expect(page.history.pushState).not.toHaveBeenCalled();
    expect(page.dispatchEvent).not.toHaveBeenCalled();
  });

  it('rejects iframe, unsupported origin, and malformed targets', () => {
    const page = pageAt('https://chat.google.com/app/home');
    Object.assign(page, {top: {}});
    expect(navigateWithinChat(bookmark, page)).toBe(false);
    expect(navigateWithinChat(bookmark, pageAt('https://example.com/'))).toBe(false);
    expect(() => navigateWithinChat({...bookmark, messageId: '../bad'}, pageAt('https://chat.google.com/'))).toThrow();
    expect(page.history.pushState).not.toHaveBeenCalled();
  });
});
