export interface ThreadIdentity {
  conversationType?: 'space' | 'dm';
  spaceId: string;
  threadId: string;
}

export interface MessageIdentity extends ThreadIdentity {
  messageId: string;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/u;

export function isValidChatId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export function isMessageIdentity(value: unknown): value is MessageIdentity {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MessageIdentity>;
  return (candidate.conversationType === undefined || candidate.conversationType === 'space' || candidate.conversationType === 'dm')
    && isValidChatId(candidate.spaceId)
    && isValidChatId(candidate.threadId)
    && isValidChatId(candidate.messageId);
}

export function bookmarkStorageKey(identity: MessageIdentity): string {
  if (!isMessageIdentity(identity)) throw new Error('invalid-message-identity');
  return `bookmark:${identity.spaceId}:${identity.threadId}:${identity.messageId}`;
}

export function buildCanonicalChatUrl(identity: MessageIdentity): string {
  if (!isMessageIdentity(identity)) throw new Error('invalid-message-identity');
  const route = identity.conversationType === 'dm' ? 'dm' : 'room';
  return `https://chat.google.com/${route}/${identity.spaceId}/${identity.threadId}/${identity.messageId}?cls=10`;
}

export function parseCanonicalChatUrl(value: string): MessageIdentity | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'chat.google.com') return null;
    const match = url.pathname.match(/^\/(room|dm)\/([^/]+)\/([^/]+)\/([^/]+)\/?$/u);
    if (!match) return null;
    const identity: MessageIdentity = {
      ...(match[1] === 'dm' ? {conversationType: 'dm'} : {}),
      spaceId: match[2],
      threadId: match[3],
      messageId: match[4],
    };
    return isMessageIdentity(identity) ? identity : null;
  } catch {
    return null;
  }
}
