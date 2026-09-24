import {isGmailUrl} from './navigation';

interface SidePanelOptionsApi {setOptions(options: chrome.sidePanel.PanelOptions): Promise<void>}

export async function configureSidePanelForTab(api: SidePanelOptionsApi, tabId: number, url?: string): Promise<void> {
  if (isGmailUrl(url)) await api.setOptions({tabId, path: 'sidepanel.html', enabled: true});
  else await api.setOptions({tabId, enabled: false});
}
