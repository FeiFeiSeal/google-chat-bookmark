importScripts('core.js');
const menuId = 'probe-bookmark';
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({id: menuId, title: '驗證：收藏此討論到 Bookmark', contexts: ['all'], documentUrlPatterns: ['https://chat.google.com/*']});
  });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== menuId || !tab?.id) return;
  try {
    const result = await chrome.tabs.sendMessage(tab.id, {type: 'probe.readContext'}, {frameId: info.frameId ?? 0});
    if (!result?.record) throw new Error(result?.error || '沒有擷取到訊息，請重新整理 Gmail 後重試。');
    const links = ChatBookmarkProbe.buildLinks(result.record, tab.url || info.pageUrl);
    await chrome.storage.session.set({probe: {...result.record, links, tabId: tab.id, frameId: info.frameId, capturedAt: new Date().toISOString()}});
    await chrome.action.setBadgeBackgroundColor({color: '#137333', tabId: tab.id});
    await chrome.action.setBadgeText({text: 'OK', tabId: tab.id});
  } catch (error) {
    await chrome.storage.session.set({probe: {error: error.message}});
    await chrome.action.setBadgeBackgroundColor({color: '#b3261e', tabId: tab.id});
    await chrome.action.setBadgeText({text: '!', tabId: tab.id});
  }
});
