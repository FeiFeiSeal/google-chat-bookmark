import {RestoreCoordinator} from '../backup/restore';
import {ChromeStorageAdapter} from '../storage/storage-adapter';
import {BookmarkRepository} from '../storage/repository';
import {UndoManager} from '../storage/undo';
import {handleBookmarkContextMenu} from './bookmark-controller';
import type {ToastMessage} from '../content/toast';
import {navigateBookmarkInTab} from './navigation';
import {configureSidePanelForActiveTab, configureSidePanelForTab} from './side-panel';
import type {MessageIdentity} from '../domain/identity';
import {UNCATEGORIZED_ID} from '../domain/schema';
import {OFFICIAL_WEBSITE_URL} from '../shared/links';
import {
  OFFICIAL_WEBSITE_MENU_ID,
  QUICK_SAVE_MENU_ID,
  categoryIdFromMenuId,
  rebuildBookmarkContextMenus,
} from './context-menu';

const local = new ChromeStorageAdapter(chrome.storage.local, 'local');
const session = new ChromeStorageAdapter(chrome.storage.session, 'session');
const repository = new BookmarkRepository(local);
const undo = new UndoManager(session, repository);
const restore = new RestoreCoordinator(local, repository);

const ready = (async () => {
  await restore.recoverInterruptedRestore();
  await repository.initialize();
})().catch(() => undefined);

let contextMenuRefresh = Promise.resolve();
function queueContextMenuRefresh(): void {
  contextMenuRefresh = contextMenuRefresh
    .then(async () => {
      await ready;
      await repository.initialize();
      const view = await repository.view();
      await rebuildBookmarkContextMenus(chrome.contextMenus, view.categories);
    })
    .catch(() => undefined);
}

void ready.then(queueContextMenuRefresh);
repository.subscribe(queueContextMenuRefresh);

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true});
  queueContextMenuRefresh();
  void chrome.tabs.query({}).then((tabs) => Promise.all(tabs.filter((tab) => tab.id !== undefined).map((tab) => configureSidePanelForTab(chrome.sidePanel, tab.id!, tab.url))));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') void configureSidePanelForTab(chrome.sidePanel, tabId, changeInfo.url ?? tab.url, tab.active);
});

chrome.tabs.onActivated.addListener(({tabId, windowId}) => {
  void configureSidePanelForActiveTab(chrome.sidePanel, chrome.tabs, tabId, windowId)
    .catch(() => undefined);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === OFFICIAL_WEBSITE_MENU_ID) {
    void chrome.tabs.create({url: OFFICIAL_WEBSITE_URL});
    return;
  }
  const categoryId = info.menuItemId === QUICK_SAVE_MENU_ID ? UNCATEGORIZED_ID : categoryIdFromMenuId(info.menuItemId);
  if (!categoryId) return;
  void ready.then(() => handleBookmarkContextMenu({
    repository,
    undo,
    sendMessage: (tabId, message, options) => chrome.tabs.sendMessage(tabId, message, options),
    notify: (tabId, frameId, message: ToastMessage) => chrome.tabs.sendMessage(tabId, {type: 'bookmark.show-toast', message, frameId}, {frameId}),
  }, info, tab ?? {}, categoryId));
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
      void navigateBookmarkInTab(chrome.tabs, tabId, command.bookmark)
        .then(respond, () => respond(false));
      return true;
    }
    respond(false);
  }
});
