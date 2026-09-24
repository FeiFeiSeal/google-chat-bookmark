import {buildCanonicalChatUrl, isMessageIdentity, type MessageIdentity} from '../domain/identity';
import {truncateGraphemes} from '../domain/title';

export interface ChatCaptureCandidate {
  identity: MessageIdentity;
  canonicalUrl: string;
  selectedMessageText: string;
  capturedAt: number;
}

const JSDATA_PATTERN = /^ykVKge;([A-Za-z0-9_-]+),([A-Za-z0-9_-]+),space\/([A-Za-z0-9_-]+);/u;
const MAX_AGE_MS = 120_000;

export function parseMessageJsData(value: string | null, messageId: string | null, threadId: string | null): MessageIdentity | null {
  const match = JSDATA_PATTERN.exec(value ?? '');
  const identity = match ? {messageId: match[1], threadId: match[2], spaceId: match[3]} : null;
  return identity && identity.messageId === messageId && identity.threadId === threadId && isMessageIdentity(identity) ? identity : null;
}

function messageText(message: Element | null): string {
  const body = message?.querySelector<HTMLElement>('[data-message-text], [data-message-body], [jsname="bgckF"]');
  const clone = body?.cloneNode(true) as HTMLElement | undefined;
  clone?.querySelectorAll('br').forEach((breakElement) => breakElement.replaceWith('\n'));
  return (body?.innerText || clone?.textContent || '').trim();
}

function textFromMessage(message: Element): string {
  const text = messageText(message);
  return truncateGraphemes(text.split(/\r?\n/u).map((line) => line.trim()).find(Boolean) ?? '');
}

export function captureCandidateFromTarget(target: EventTarget | null, capturedAt = Date.now()): ChatCaptureCandidate | null {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  if (!element || element.closest('input, textarea, [contenteditable="true"]')) return null;
  const message = element.closest<HTMLElement>('[data-id][data-message-multiplat-item-id][jsdata]');
  const thread = message?.closest<HTMLElement>('[data-topic-id]');
  if (!message || !thread) return null;
  const identity = parseMessageJsData(message.getAttribute('jsdata'), message.dataset.id ?? null, thread.dataset.topicId ?? null);
  if (!identity) return null;
  return {
    identity,
    canonicalUrl: buildCanonicalChatUrl(identity),
    selectedMessageText: textFromMessage(message),
    capturedAt,
  };
}

export function takeFreshCandidate(candidate: ChatCaptureCandidate | null, now = Date.now()): ChatCaptureCandidate | null {
  return candidate && now >= candidate.capturedAt && now - candidate.capturedAt <= MAX_AGE_MS ? candidate : null;
}
