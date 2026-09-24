import {afterEach, describe, expect, it, vi} from 'vitest';
import {buildDiagnosticPayload, showToast} from './toast';

afterEach(() => document.body.replaceChildren());

describe('page feedback', () => {
  it('shows success actions without opening the panel automatically', () => {
    const action = vi.fn();
    showToast({kind: 'created', token: 'token'}, action);
    expect(document.body.textContent).toContain('已收藏這則訊息');
    expect(action).not.toHaveBeenCalled();
    (document.querySelector('[data-action="undo"]') as HTMLButtonElement).click();
    expect(action).toHaveBeenCalledWith('undo', 'token');
  });

  it('shows duplicate and safe diagnostic actions', () => {
    showToast({kind: 'duplicate'}, vi.fn());
    expect(document.body.textContent).toContain('這則訊息已收藏');
    const diagnostic = buildDiagnosticPayload({pageType: 'gmail-chat-iframe', frameId: 31, stage: 'parse', errorCode: 'invalid-target', at: '2026-09-22T00:00:00.000Z'});
    expect(diagnostic).not.toContain('message text');
    expect(diagnostic).not.toContain('participants');
    expect(diagnostic).toContain('invalid-target');
  });
});
