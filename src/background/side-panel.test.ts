import {describe, expect, it, vi} from 'vitest';
import {configureSidePanelForTab} from './side-panel';

describe('tab-specific Side Panel', () => {
  it('enables Gmail tabs including inbox and disables other sites', async () => {
    const setOptions = vi.fn();
    await configureSidePanelForTab({setOptions}, 1, 'https://mail.google.com/mail/u/0/#inbox');
    await configureSidePanelForTab({setOptions}, 2, 'https://example.com/');
    expect(setOptions).toHaveBeenNthCalledWith(1, {tabId: 1, path: 'sidepanel.html', enabled: true});
    expect(setOptions).toHaveBeenNthCalledWith(2, {tabId: 2, enabled: false});
  });
});
