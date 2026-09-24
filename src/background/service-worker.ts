import {RestoreCoordinator} from '../backup/restore';
import {ChromeStorageAdapter} from '../storage/storage-adapter';
import {BookmarkRepository} from '../storage/repository';
import {UndoManager} from '../storage/undo';
import {handleBookmarkContextMenu} from './bookmark-controller';
import type {ToastMessage} from '../content/toast';
import {buildGmailNavigationUrl} from './navigation';
import {configureSidePanelForTab} from './side-panel';
import type {MessageIdentity} from '../domain/identity';

const MENU_ID = 'google-chat-bookmark-save';
const local = new ChromeStorageAdapter(chrome.storage.local, 'local');
const session = new ChromeStorageAdapter(chrome.storage.session, 'session');
const repository = new BookmarkRepository(local);
const undo = new UndoManager(session, repository);
const restore = new RestoreCoordinator(local, repository);

const ready = (async () => {
  await restore.recoverInterruptedRestore();
  await repository.initialize();
})().catch(() => undefined);

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true});
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({id: MENU_ID, title: '收藏這個討論', contexts: ['all'], documentUrlPatterns: ['https://chat.google.com/*']});
  });
  void chrome.tabs.query({}).then((tabs) => Promise.all(tabs.filter((tab) => tab.id !== undefined).map((tab) => configureSidePanelForTab(chrome.sidePanel, tab.id!, tab.url))));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') void configureSidePanelForTab(chrome.sidePanel, tabId, changeInfo.url ?? tab.url);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  void ready.then(() => handleBookmarkContextMenu({
    repository,
    undo,
    sendMessage: (tabId, message, options) => chrome.tabs.sendMessage(tabId, message, options),
    notify: (tabId, frameId, message: ToastMessage) => chrome.tabs.sendMessage(tabId, {type: 'bookmark.show-toast', message, frameId}, {frameId}),
  }, info, tab ?? {}));
});

chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return;
  const command = message as {type?: string; token?: string; tabId?: number; bookmark?: MessageIdentity};
  if (command.type === 'bookmark.undo' && command.token) {
    void ready.then(() => undo.undo(command.token!)).then(respond);
    return true;
  }
  if (command.type === 'bookmark.open-panel' && sender.tab?.id !== undefined) {
    void chrome.sidePanel.open({tabId: sender.tab.id});
  }
  if ((command.type === 'bookmark.navigate' || command.type === 'bookmark.jump-bookmark') && command.bookmark) {
    const tabId = command.tabId ?? sender.tab?.id;
    if (tabId !== undefined) {
      void chrome.tabs.get(tabId)
        .then((tab) => chrome.tabs.update(tabId, {url: buildGmailNavigationUrl(tab.url ?? '', command.bookmark!), active: true}))
        .then(() => respond(true), () => respond(false));
      return true;
    }
    respond(false);
  }
});
