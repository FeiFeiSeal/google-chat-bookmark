import {describe, expect, it} from 'vitest';
import {captureCandidateFromTarget, takeFreshCandidate} from './google-chat-parser';

function fixture(options: {message?: string; thread?: string; jsMessage?: string; jsThread?: string} = {}) {
  const message = options.message ?? 'reply_2';
  const thread = options.thread ?? 'root-1';
  const jsMessage = options.jsMessage ?? message;
  const jsThread = options.jsThread ?? thread;
  document.body.innerHTML = `<div data-room-name="專案聊天室"><section data-topic-id="${thread}"><article data-id="root-1" data-message-multiplat-item-id jsdata="ykVKge;root-1,${thread},space/space_1;"><div data-message-text>起始訊息第一行<br>第二行</div></article><article data-id="${message}" data-message-multiplat-item-id jsdata="ykVKge;${jsMessage},${jsThread},space/space_1;"><div data-message-body><span id="target">被收藏的回覆內容</span></div></article></section></div>`;
  return document.querySelector('#target')!;
}

describe('Google Chat DOM parser', () => {
  it('captures the exact reply identity and selected message text', () => {
    const candidate = captureCandidateFromTarget(fixture(), 1000);
    expect(candidate).toEqual({identity: {spaceId: 'space_1', threadId: 'root-1', messageId: 'reply_2'}, canonicalUrl: 'https://chat.google.com/room/space_1/root-1/reply_2?cls=10', selectedMessageText: '被收藏的回覆內容', capturedAt: 1000});
    expect(candidate).not.toHaveProperty('html');
    expect(candidate).not.toHaveProperty('participants');
  });

  it('captures direct-message jsdata and builds a dm anchor', () => {
    document.body.innerHTML = '<section data-topic-id="thread-2"><article data-id="reply-3" data-message-multiplat-item-id jsdata="ykVKge;reply-3,thread-2,dm/woI29KAAAAE;$42"><div data-message-body><span id="target">一對一訊息</span></div></article></section>';
    expect(captureCandidateFromTarget(document.querySelector('#target'), 1000)).toEqual({
      identity: {conversationType: 'dm', spaceId: 'woI29KAAAAE', threadId: 'thread-2', messageId: 'reply-3'},
      canonicalUrl: 'https://chat.google.com/dm/woI29KAAAAE/thread-2/reply-3?cls=10',
      selectedMessageText: '一對一訊息',
      capturedAt: 1000,
    });
  });

  it('caps the selected reply text at 30 graphemes instead of using the thread root', () => {
    document.body.innerHTML = `<main><section data-topic-id="root"><article data-id="root" jsdata="ykVKge;root,root,space/space_2;"><div data-message-body>不應使用的討論串起始訊息</div></article><article data-id="reply" data-message-multiplat-item-id jsdata="ykVKge;reply,root,space/space_2;"><div data-message-body><span id="target">${'被收藏的回覆😀'.repeat(6)}</span></div></article></section></main>`;
    const candidate = captureCandidateFromTarget(document.querySelector('#target'), 1000)!;
    expect(Array.from(candidate.selectedMessageText)).toHaveLength(30);
    expect(candidate.selectedMessageText.startsWith('被收藏的回覆')).toBe(true);
    expect(candidate.selectedMessageText).not.toContain('不應使用');
  });

  it.each([
    () => fixture({jsMessage: 'wrong'}),
    () => fixture({jsThread: 'wrong'}),
    () => { document.body.innerHTML = '<div id="target">空白</div>'; return document.querySelector('#target')!; },
    () => { document.body.innerHTML = '<input id="target">'; return document.querySelector('#target')!; },
  ])('fails closed for mismatches and non-message targets', (makeTarget) => expect(captureCandidateFromTarget(makeTarget(), 1000)).toBeNull());

  it('returns a candidate once within two minutes and rejects stale data', () => {
    const candidate = captureCandidateFromTarget(fixture(), 1000)!;
    expect(takeFreshCandidate(candidate, 120999)).toEqual(candidate);
    expect(takeFreshCandidate(candidate, 121001)).toBeNull();
  });
});
