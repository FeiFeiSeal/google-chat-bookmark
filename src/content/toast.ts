import {messages} from '../shared/messages';
import type {MessageIdentity} from '../domain/identity';

export type ToastMessage =
  | {kind: 'created'; token: string}
  | {kind: 'duplicate'; bookmark?: MessageIdentity}
  | {kind: 'error'; errorCode: string; diagnostic?: string};

export type ToastAction = 'undo' | 'open-panel' | 'jump-bookmark' | 'copy-diagnostic';

export function buildDiagnosticPayload(input: {pageType: string; frameId: number; stage: string; errorCode: string; at?: string}): string {
  const version = typeof chrome !== 'undefined' && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : 'test';
  return JSON.stringify({extensionVersion: version, chromeVersion: navigator.userAgent, pageType: input.pageType, frameId: input.frameId, stage: input.stage, errorCode: input.errorCode, at: input.at ?? new Date().toISOString()}, null, 2);
}

export function showToast(message: ToastMessage, onAction: (action: ToastAction, token?: string) => void): void {
  document.querySelector('[data-chat-bookmark-toast]')?.remove();
  const toast = document.createElement('div');
  toast.dataset.chatBookmarkToast = '';
  Object.assign(toast.style, {position: 'fixed', right: '20px', bottom: '20px', zIndex: '2147483647', maxWidth: '360px', padding: '14px', borderRadius: '12px', color: '#fff', background: '#202124', boxShadow: '0 4px 18px rgba(0,0,0,.3)', font: '14px/1.4 system-ui'});
  const label = document.createElement('div');
  label.setAttribute('role', 'status');
  label.textContent = message.kind === 'created' ? messages.saved : message.kind === 'duplicate' ? messages.duplicate : messages.captureError;
  toast.append(label);
  const actions: Array<[ToastAction, string]> = message.kind === 'created'
    ? [['undo', messages.undo], ['open-panel', messages.openPanel]]
    : message.kind === 'duplicate'
      ? [['jump-bookmark', messages.jumpBookmark], ['open-panel', messages.openPanel]]
      : [['copy-diagnostic', messages.copyDiagnostics]];
  for (const [action, text] of actions) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.action = action; button.textContent = text;
    Object.assign(button.style, {margin: '10px 8px 0 0', border: '0', color: '#a8c7fa', background: 'transparent', cursor: 'pointer'});
    button.addEventListener('click', () => onAction(action, message.kind === 'created' ? message.token : undefined));
    toast.append(button);
  }
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 8000);
}
