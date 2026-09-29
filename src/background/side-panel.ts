import {isGmailUrl} from './navigation';

interface SidePanelOptionsApi {
  setOptions(options: chrome.sidePanel.PanelOptions): Promise<void>;
  close?(options: chrome.sidePanel.CloseOptions): Promise<void>;
}

interface TabsApi {
  get(tabId: number): Promise<chrome.tabs.Tab>;
  query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
}

export async function configureSidePanelForTab(api: SidePanelOptionsApi, tabId: number, url?: string, closeWhenDisabled = false): Promise<void> {
  if (isGmailUrl(url)) await api.setOptions({tabId, path: 'sidepanel.html', enabled: true});
  else {
    await api.setOptions({tabId, enabled: false});
    if (closeWhenDisabled && api.close) {
      try { await api.close({tabId}); } catch { /* Already closed or only a different panel is open. */ }
    }
  }
}

export async function configureSidePanelForActiveTab(api: SidePanelOptionsApi, tabs: TabsApi, tabId: number, windowId: number): Promise<void> {
  const activeTab = await tabs.get(tabId);
  await configureSidePanelForTab(api, tabId, activeTab.url);
  if (isGmailUrl(activeTab.url) || !api.close) return;
  const windowTabs = await tabs.query({windowId});
  const gmailTabIds = windowTabs.filter((tab) => tab.id !== undefined && isGmailUrl(tab.url)).map((tab) => tab.id!);
  await Promise.allSettled(gmailTabIds.map((gmailTabId) => api.close!({tabId: gmailTabId})));
  try { await api.close({windowId}); } catch { /* No global panel is open. */ }
}
