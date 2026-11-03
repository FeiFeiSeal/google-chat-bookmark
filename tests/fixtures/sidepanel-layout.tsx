import {useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/sidepanel/App';
import '../../src/sidepanel/styles.css';
import {bookmarkStorageKey, buildCanonicalChatUrl} from '../../src/domain/identity';
import {CURRENT_STORAGE_SCHEMA_VERSION, UNCATEGORIZED_CATEGORY, type Bookmark} from '../../src/domain/schema';
import {truncateGraphemes} from '../../src/domain/title';
import {BookmarkRepository, METADATA_KEY, EXPANDED_CATEGORIES_KEY} from '../../src/storage/repository';
import {MemoryStorageAdapter} from '../../src/storage/storage-adapter';

const modes = ['Demo data', 'Worst case', 'Empty', 'One', '1,000 rows'] as const;
type Mode = typeof modes[number];
const worstTitles = [
  '最危險的地方就是最危險的地方就是最危險的地方就是最危險的地方就是',
  'Benachrichtigungseinstellungen',
  '👩🏽‍💻'.repeat(30),
  'https://example.com/workspaces/acme/projects/q3-launch/docs',
  '測試討論串',
];

function fixture(mode: Mode) {
  const worst = mode === 'Worst case' || mode === '1,000 rows';
  const date = '2026-10-29T00:00:00.000Z';
  const categories = [
    {...UNCATEGORIZED_CATEGORY},
    {id: 'project', name: worst ? '跨部門專案技術規格與正式上線前待辦事項及問題追蹤討論分類' : '前端組', createdAt: date, updatedAt: date},
  ];
  const count = mode === 'Empty' ? 0 : mode === 'One' ? 1 : mode === '1,000 rows' ? 1000 : 5;
  const bookmarks: Bookmark[] = Array.from({length: count}, (_, index) => {
    const identity = {spaceId: 'fixture', threadId: `thread-${index}`, messageId: `message-${index}`};
    return {
      ...identity, schemaVersion: 1, url: buildCanonicalChatUrl(identity),
      title: truncateGraphemes(worst ? worstTitles[index % worstTitles.length] : ['十月週會串串', '十月請假串', '新人訓練題目討論串', 'SBOM & D-Track', 'AI 技巧分享串'][index % 5]),
      categoryId: index % 2 ? 'project' : 'uncategorized', sourceRoomName: 'Google Chat',
      note: worst ? '跨部門專案討論與待辦事項'.repeat(40) : '下次討論前確認待辦事項',
      pinned: index < 2, createdAt: date, updatedAt: date,
    };
  });
  const categoryOrder = categories.map(({id}) => id);
  return new BookmarkRepository(new MemoryStorageAdapter({
    [METADATA_KEY]: {schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION, revision: 0, categoryOrder, pinnedOrder: bookmarks.filter(({pinned}) => pinned).map(bookmarkStorageKey)},
    [EXPANDED_CATEGORIES_KEY]: categoryOrder,
    ...Object.fromEntries(categories.map((category) => [`category:${category.id}`, category])),
    ...Object.fromEntries(categories.map(({id}) => [`order:${id}`, bookmarks.filter(({categoryId}) => categoryId === id).map(bookmarkStorageKey)])),
    ...Object.fromEntries(bookmarks.map((bookmark) => [bookmarkStorageKey(bookmark), bookmark])),
  }));
}

function LayoutPreview() {
  const initial = new URLSearchParams(location.search).get('data');
  const [mode, setMode] = useState<Mode>(modes.find((value) => value === initial) ?? 'Demo data');
  const repository = useMemo(() => fixture(mode), [mode]);
  return <>
    <div style={{height: 'calc(100% - 76px)'}}><App key={mode} repository={repository} onNavigate={() => true}/></div>
    <label style={{position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', padding: 8, background: 'var(--color-surface-alt)', borderRadius: 8, whiteSpace: 'nowrap'}}>
      <span className="sr-only">測試資料</span>
      <select aria-label="測試資料" value={mode} onChange={(event) => {
        const next = event.target.value as Mode;
        history.replaceState(null, '', `?data=${encodeURIComponent(next)}`);
        setMode(next);
      }}>{modes.map((value) => <option key={value}>{value}</option>)}</select>
    </label>
  </>;
}

// 此頁只由 Vite dev server 載入，正式擴充功能的 build entry 不包含它。
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<LayoutPreview/>);
