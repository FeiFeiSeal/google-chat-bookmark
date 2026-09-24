import {isMessageIdentity, type MessageIdentity} from '../domain/identity';

export function isGmailUrl(value?: string): boolean {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'mail.google.com'; } catch { return false; }
}

export function buildGmailNavigationUrl(currentUrl: string, bookmark: MessageIdentity): string {
  if (!isGmailUrl(currentUrl) || !isMessageIdentity(bookmark)) throw new Error('invalid-gmail-navigation');
  const url = new URL(currentUrl);
  url.hash = `chat/space/${bookmark.spaceId}/${bookmark.threadId}/${bookmark.messageId}`;
  return url.toString();
}
