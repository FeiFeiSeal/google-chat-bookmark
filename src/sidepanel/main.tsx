import React from 'react';
import ReactDOM from 'react-dom/client';
import {App} from './App';
import './styles.css';
import {ChromeStorageAdapter} from '../storage/storage-adapter';
import {BookmarkRepository} from '../storage/repository';
import {RestoreCoordinator} from '../backup/restore';
import {downloadBackup} from '../backup/backup';

const storage = new ChromeStorageAdapter(chrome.storage.local, 'local');
const repository = new BookmarkRepository(storage);
const restore = new RestoreCoordinator(storage, repository);

async function navigate(bookmark: {spaceId: string; threadId: string; messageId: string}) {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (tab?.id === undefined) return false;
  return (await chrome.runtime.sendMessage({type: 'bookmark.navigate', tabId: tab.id, bookmark})) === true;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App repository={repository} diagnostics={{backup: downloadBackup, preflight: (json) => restore.preflight(json), restore: (candidate) => restore.restore(candidate)}} onNavigate={navigate} />
  </React.StrictMode>,
);
