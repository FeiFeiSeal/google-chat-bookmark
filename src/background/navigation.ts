import {isMessageIdentity, type MessageIdentity} from '../domain/identity';

export function isGmailUrl(value?: string): boolean {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'mail.google.com'; } catch { return false; }
}

export function isSupportedChatUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['mail.google.com', 'chat.google.com'].includes(url.hostname);
  } catch { return false; }
}

export function buildBookmarkNavigationUrl(currentUrl: string, bookmark: MessageIdentity): string {
  if (!isSupportedChatUrl(currentUrl) || !isMessageIdentity(bookmark)) throw new Error('invalid-bookmark-navigation');
  if (isGmailUrl(currentUrl)) return buildGmailNavigationUrl(currentUrl, bookmark);
  const url = new URL(currentUrl);
  if (url.hash.startsWith('#chat/')) {
    const route = bookmark.conversationType === 'dm' ? 'dm' : 'space';
    url.hash = `chat/${route}/${bookmark.spaceId}/${bookmark.threadId}/${bookmark.messageId}`;
  } else {
    const accountPrefix = url.pathname.match(/^\/u\/\d+(?=\/|$)/u)?.[0] ?? '';
    url.pathname = `${accountPrefix}/app/chat/${bookmark.spaceId}/topic/${bookmark.threadId}/message/${bookmark.messageId}`;
    url.hash = '';
  }
  return url.toString();
}

interface NavigationTabsApi {
  get(tabId: number): Promise<Pick<chrome.tabs.Tab, 'url'>>;
  update(tabId: number, properties: chrome.tabs.UpdateProperties): Promise<unknown>;
  sendMessage(tabId: number, message: unknown, options: {frameId: number}): Promise<unknown>;
}

export async function navigateBookmarkInTab(tabs: NavigationTabsApi, tabId: number, bookmark: MessageIdentity): Promise<boolean> {
  const tab = await tabs.get(tabId);
  const url = buildBookmarkNavigationUrl(tab.url ?? '', bookmark);
  if (isGmailUrl(tab.url)) {
    await tabs.update(tabId, {url, active: true});
    return true;
  }
  // tabs.update with a new pathname performs a document navigation. Let Chat's
  // existing page handle its route instead; a missing receiver must not reload it.
  return await tabs.sendMessage(tabId, {type: 'bookmark.navigate-in-page', bookmark}, {frameId: 0}) === true;
}

export function buildGmailNavigationUrl(currentUrl: string, bookmark: MessageIdentity): string {
  if (!isGmailUrl(currentUrl) || !isMessageIdentity(bookmark)) throw new Error('invalid-gmail-navigation');
  const url = new URL(currentUrl);
  const route = bookmark.conversationType === 'dm' ? 'dm' : 'space';
  url.hash = `chat/${route}/${bookmark.spaceId}/${bookmark.threadId}/${bookmark.messageId}`;
  return url.toString();
}
