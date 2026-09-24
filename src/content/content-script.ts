import {captureCandidateFromTarget, takeFreshCandidate, type ChatCaptureCandidate} from './google-chat-parser';
import {buildDiagnosticPayload, showToast, type ToastAction, type ToastMessage} from './toast';

let lastCandidate: ChatCaptureCandidate | null = null;

document.addEventListener('contextmenu', (event) => {
  lastCandidate = captureCandidateFromTarget(event.target);
}, true);

chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return;
  const command = message as {type?: string; message?: ToastMessage; frameId?: number};
  if (command.type === 'bookmark.read-context') {
    const candidate = takeFreshCandidate(lastCandidate);
    lastCandidate = null;
    respond(candidate ? {ok: true, candidate} : {ok: false, errorCode: 'invalid-or-stale-target'});
    return;
  }
  if (command.type === 'bookmark.show-toast' && command.message) {
    showToast(command.message, (action: ToastAction, token?: string) => {
      if (action === 'copy-diagnostic') {
        const payload = buildDiagnosticPayload({pageType: 'gmail-chat-iframe', frameId: command.frameId ?? 0, stage: 'capture', errorCode: command.message?.kind === 'error' ? command.message.errorCode : 'unknown'});
        void navigator.clipboard.writeText(payload);
      } else {
        void chrome.runtime.sendMessage({type: `bookmark.${action}`, token, bookmark: command.message?.kind === 'duplicate' ? command.message.bookmark : undefined});
      }
    });
  }
});
