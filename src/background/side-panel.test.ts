import {describe, expect, it, vi} from 'vitest';
import {configureSidePanelForActiveTab, configureSidePanelForTab} from './side-panel';

describe('tab-specific Side Panel', () => {
  it('enables Gmail and standalone Chat tabs and disables other sites', async () => {
    const setOptions = vi.fn();
    await configureSidePanelForTab({setOptions}, 1, 'https://mail.google.com/mail/u/0/#inbox');
    await configureSidePanelForTab({setOptions}, 2, 'https://example.com/');
    expect(setOptions).toHaveBeenNthCalledWith(1, {tabId: 1, path: 'sidepanel.html', enabled: true});
    expect(setOptions).toHaveBeenNthCalledWith(2, {tabId: 2, enabled: false});
    await configureSidePanelForTab({setOptions}, 3, 'https://chat.google.com/u/0/app/home');
    expect(setOptions).toHaveBeenLastCalledWith({tabId: 3, path: 'sidepanel.html', enabled: true});
  });

  it('closes the panel when the active tab leaves Gmail', async () => {
    const setOptions = vi.fn();
    const close = vi.fn().mockResolvedValue(undefined);
    await configureSidePanelForTab({setOptions, close}, 2, 'https://example.com/', true);
    expect(setOptions).toHaveBeenCalledWith({tabId: 2, enabled: false});
    expect(close).toHaveBeenCalledWith({tabId: 2});
  });

  it('does not close for background tabs, Gmail navigation, or unsupported close errors', async () => {
    const setOptions = vi.fn();
    const close = vi.fn().mockRejectedValue(new Error('already-closed'));
    await configureSidePanelForTab({setOptions, close}, 2, 'https://example.com/');
    expect(close).not.toHaveBeenCalled();
    await configureSidePanelForTab({setOptions, close}, 1, 'https://mail.google.com/mail/u/0/#inbox', true);
    expect(close).not.toHaveBeenCalled();
    await expect(configureSidePanelForTab({setOptions, close}, 3, 'https://example.com/', true)).resolves.toBeUndefined();
  });

  it('closes the previous Gmail tab panel when another site becomes active', async () => {
    const setOptions = vi.fn();
    const close = vi.fn().mockImplementation(async ({tabId}: chrome.sidePanel.CloseOptions) => {
      if (tabId === 4) return;
      throw new Error('no-global-panel');
    });
    const tabs = {
      get: vi.fn().mockResolvedValue({id: 9, windowId: 3, url: 'https://example.com/'}),
      query: vi.fn().mockResolvedValue([
        {id: 4, windowId: 3, url: 'https://mail.google.com/mail/u/0/#chat/home'},
        {id: 5, windowId: 3, url: 'https://chat.google.com/u/0/app/home'},
        {id: 9, windowId: 3, url: 'https://example.com/'},
      ]),
    };
    await configureSidePanelForActiveTab({setOptions, close}, tabs, 9, 3);
    expect(setOptions).toHaveBeenCalledWith({tabId: 9, enabled: false});
    expect(close).toHaveBeenCalledWith({tabId: 4});
    expect(close).toHaveBeenCalledWith({tabId: 5});
    expect(close).toHaveBeenCalledWith({windowId: 3});
  });

  it.each(['https://mail.google.com/mail/u/0/#inbox', 'https://chat.google.com/u/0/app/home'])('keeps the panel when a supported tab becomes active: %s', async (url) => {
    const setOptions = vi.fn();
    const close = vi.fn();
    const tabs = {
      get: vi.fn().mockResolvedValue({id: 5, windowId: 3, url}),
      query: vi.fn(),
    };
    await configureSidePanelForActiveTab({setOptions, close}, tabs, 5, 3);
    expect(setOptions).toHaveBeenCalledWith({tabId: 5, path: 'sidepanel.html', enabled: true});
    expect(tabs.query).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('closes the Gmail panel when a tab outside host permissions has no URL', async () => {
    const setOptions = vi.fn();
    const close = vi.fn().mockResolvedValue(undefined);
    const tabs = {
      get: vi.fn().mockResolvedValue({id: 9, windowId: 3}),
      query: vi.fn().mockResolvedValue([
        {id: 4, windowId: 3, url: 'https://mail.google.com/mail/u/0/#chat/home'},
        {id: 9, windowId: 3},
      ]),
    };
    await configureSidePanelForActiveTab({setOptions, close}, tabs, 9, 3);
    expect(setOptions).toHaveBeenCalledWith({tabId: 9, enabled: false});
    expect(close).toHaveBeenCalledWith({tabId: 4});
    expect(close).toHaveBeenCalledWith({windowId: 3});
  });
});
