import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {App, projectBookmarkOrders, resolveOrganizationDrop, type PanelRepository} from './App';
import {MemoryStorageAdapter} from '../storage/storage-adapter';
import {BookmarkRepository} from '../storage/repository';
import {sampleBookmark} from '../storage/repository.test';
import {UNCATEGORIZED_CATEGORY, type Bookmark, type LibraryView} from '../domain/schema';
import {bookmarkStorageKey} from '../domain/identity';

const styles = readFileSync('src/sidepanel/styles.css', 'utf8');
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function item(threadId: string, fields: Partial<Bookmark> = {}): Bookmark {
  return {
    ...sampleBookmark(threadId), threadId, messageId: threadId,
    url: `https://chat.google.com/room/space/${threadId}/${threadId}?cls=10`,
    ...fields,
  };
}

async function repositoryWith(...bookmarks: Bookmark[]) {
  const repository = new BookmarkRepository(new MemoryStorageAdapter());
  await repository.initialize();
  for (const bookmark of bookmarks) await repository.create(bookmark);
  await repository.setCategoryExpanded('uncategorized', true);
  return repository;
}

function fakeRepository(view: LibraryView): PanelRepository {
  return {
    initialize: vi.fn(async () => undefined), view: vi.fn(async () => view), snapshot: vi.fn(async () => view), subscribe: vi.fn(() => () => undefined),
    updateBookmark: vi.fn(), markOpened: vi.fn(), createCategory: vi.fn(), renameCategory: vi.fn(), setCategoryExpanded: vi.fn(),
    reorderCategories: vi.fn(), moveBookmark: vi.fn(), setPinned: vi.fn(), reorderPinned: vi.fn(), deleteBookmark: vi.fn(), deleteCategory: vi.fn(), restoreDeletion: vi.fn(),
  };
}

describe('App', () => {
  it('resolves category reorder and cross-category bookmark drops', () => {
    const bookmark = item('drag-decision');
    const key = bookmarkStorageKey(bookmark);
    const targetBookmark = item('target-existing', {categoryId: 'target'});
    const targetKey = bookmarkStorageKey(targetBookmark);
    const view: LibraryView = {
      metadata: {schemaVersion: 3, revision: 0, categoryOrder: ['uncategorized', 'target'], pinnedOrder: []},
      categories: [UNCATEGORIZED_CATEGORY, {id: 'target', name: '目標', createdAt: bookmark.createdAt, updatedAt: bookmark.updatedAt}],
      bookmarks: [bookmark, targetBookmark], orders: {uncategorized: [key], target: [targetKey]}, expandedCategoryIds: ['uncategorized'],
    };
    expect(resolveOrganizationDrop(view, {kind: 'category', categoryId: 'uncategorized'}, {kind: 'category', categoryId: 'target'})).toEqual({kind: 'categories', categoryIds: ['target', 'uncategorized']});
    expect(resolveOrganizationDrop(view, {kind: 'bookmark', categoryId: 'uncategorized', key}, {kind: 'category', categoryId: 'target'})).toEqual({kind: 'bookmark', key, targetCategoryId: 'target', targetIndex: 0});
    expect(projectBookmarkOrders(view, {key, targetCategoryId: 'target', targetIndex: 0})).toEqual({uncategorized: [], target: [key, targetKey]});
    expect(projectBookmarkOrders(view, {key, targetCategoryId: 'target', targetIndex: 1})).toEqual({uncategorized: [], target: [targetKey, key]});
  });

  it('renders the Traditional Chinese empty state', () => {
    render(<App />);
    expect(screen.queryByRole('heading', {name: 'Chat Bookmark'})).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '新增分類'})).toBeInTheDocument();
    expect(screen.getByText('還沒有收藏')).toBeInTheDocument();
  });

  it('defines automatic light/dark semantic colors and an internally scrolling list', () => {
    expect(styles).toContain(':root');
    expect(styles).toContain('--color-bg');
    expect(styles).toContain('@media (prefers-color-scheme: dark)');
    expect(styles).toContain('.list-region');
    expect(styles).toContain('overflow-y: auto');
    expect(styles).toContain('overflow-x: hidden');
    expect(styles).toContain('text-overflow: ellipsis');
    expect(styles).toContain('white-space: nowrap');
    expect(styles).toContain('min-width: 240px');
    expect(styles).toContain('.toolbar-row');
    expect(styles).toContain('.category-header .row-actions, .more-menu.open { opacity: 1; }');
  });

  it('keeps a 1,000-bookmark category collapsed and renders rows only when expanded', async () => {
    const bookmarks = Array.from({length: 1000}, (_, index) => item(`thread-${index}`, {title: `很長的標題 ${index}`}));
    const keys = bookmarks.map((bookmark) => `bookmark:${bookmark.spaceId}:${bookmark.threadId}:${bookmark.messageId}`);
    const view: LibraryView = {
      metadata: {schemaVersion: 3, revision: 0, categoryOrder: ['uncategorized'], pinnedOrder: []},
      categories: [UNCATEGORIZED_CATEGORY], bookmarks, orders: {uncategorized: keys}, expandedCategoryIds: [],
    };
    const repository = fakeRepository(view);
    const {rerender} = render(<App repository={repository}/>);
    await screen.findByRole('button', {name: /未分類/});
    expect(screen.queryByRole('button', {name: /開啟:/})).not.toBeInTheDocument();
    view.expandedCategoryIds = ['uncategorized'];
    rerender(<App repository={fakeRepository(view)}/>);
    expect(await screen.findAllByRole('button', {name: /開啟:/}, {timeout: 4000})).toHaveLength(1000);
  });

  it('updates an open view after repository storage changes', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter());
    render(<App repository={repository}/>);
    await screen.findByText('還沒有收藏');
    await repository.create(sampleBookmark());
    await waitFor(() => expect(screen.getByRole('button', {name: /未分類/})).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', {name: /未分類/}));
    expect(await screen.findByRole('button', {name: '開啟: 標題'})).toBeInTheDocument();
  });

  it('opens the saved message from the title and shows collapsible details', async () => {
    const bookmark = item('details', {sourceRoomName: '相容舊資料但不顯示', note: '我的線索'});
    const repository = await repositoryWith(bookmark);
    const onNavigate = vi.fn().mockResolvedValue(true);
    render(<App repository={repository} onNavigate={onNavigate}/>);
    const title = await screen.findByRole('button', {name: '開啟: 標題'});
    fireEvent.click(title);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({threadId: 'details'})));
    fireEvent.click(screen.getByRole('button', {name: '展開詳細資訊'}));
    const details = screen.getByText('我的線索').closest('.bookmark-details')!;
    expect(within(details as HTMLElement).queryByText('分類')).not.toBeInTheDocument();
    expect(within(details as HTMLElement).queryByText('收藏時間')).not.toBeInTheDocument();
    expect(within(details as HTMLElement).getByLabelText(/收藏時間：/)).toBeInTheDocument();
    expect(details.querySelector('.time-icon')).toBeInTheDocument();
    expect(screen.queryByText('來源聊天室')).not.toBeInTheDocument();
  });

  it('saves valid inline edits and rejects a blank title', async () => {
    const repository = await repositoryWith(item('edit'));
    render(<App repository={repository}/>);
    fireEvent.click((await screen.findAllByLabelText('更多操作'))[0]);
    fireEvent.click(screen.getByRole('button', {name: '編輯'}));
    fireEvent.change(screen.getByLabelText('標題'), {target: {value: '新標題'}});
    fireEvent.change(screen.getByLabelText('筆記'), {target: {value: '新筆記'}});
    fireEvent.click(screen.getByRole('button', {name: '儲存'}));
    expect(await screen.findByRole('button', {name: '開啟: 新標題'})).toBeInTheDocument();
    fireEvent.click((await screen.findAllByLabelText('更多操作'))[0]);
    fireEvent.click(screen.getByRole('button', {name: '編輯'}));
    fireEvent.change(screen.getByLabelText('標題'), {target: {value: '   '}});
    fireEvent.click(screen.getByRole('button', {name: '儲存'}));
    expect(screen.getByRole('alert')).toHaveTextContent('標題不能空白');
  });

  it('discards an unsaved edit on cancel and unmount and limits visible characters', async () => {
    const repository = await repositoryWith(item('draft'));
    const first = render(<App repository={repository}/>);
    fireEvent.click((await screen.findAllByLabelText('更多操作'))[0]);
    fireEvent.click(screen.getByRole('button', {name: '編輯'}));
    fireEvent.change(screen.getByLabelText('標題'), {target: {value: '😀'.repeat(31)}});
    expect(screen.getByLabelText('標題')).toHaveValue('😀'.repeat(30));
    fireEvent.change(screen.getByLabelText('筆記'), {target: {value: '字'.repeat(501)}});
    expect(screen.getByLabelText('筆記')).toHaveValue('字'.repeat(500));
    expect(screen.getByText('500/500')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '取消'}));
    expect(screen.getByRole('button', {name: '開啟: 標題'})).toBeInTheDocument();
    fireEvent.click((await screen.findAllByLabelText('更多操作'))[0]);
    fireEvent.click(screen.getByRole('button', {name: '編輯'}));
    fireEvent.change(screen.getByLabelText('筆記'), {target: {value: '未儲存'}});
    first.unmount();
    render(<App repository={repository}/>);
    await screen.findByRole('button', {name: '開啟: 標題'});
    expect((await repository.getByMessage(item('draft')))?.note).toBe('');
  });

  it('closes a bookmark action menu when the pointer leaves its row', async () => {
    const repository = await repositoryWith(item('menu-close'));
    render(<App repository={repository}/>);
    const more = (await screen.findAllByLabelText('更多操作'))[0];
    fireEvent.click(more);
    expect(screen.getByRole('button', {name: '編輯'})).toBeInTheDocument();
    fireEvent.mouseLeave(more.closest('.bookmark-row')!);
    expect(screen.queryByRole('button', {name: '編輯'})).not.toBeInTheDocument();
    expect(more).toHaveAttribute('aria-expanded', 'false');
  });

  it('deletes one bookmark immediately and restores it with Undo', async () => {
    const bookmark = item('delete');
    const repository = await repositoryWith(bookmark);
    render(<App repository={repository}/>);
    fireEvent.click((await screen.findAllByLabelText('更多操作'))[0]);
    fireEvent.click(screen.getByRole('button', {name: '刪除 Bookmark'}));
    expect(await screen.findByText('已刪除 Bookmark')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '復原'}));
    expect(await screen.findByRole('button', {name: '開啟: 標題'})).toBeInTheDocument();
  });

  it('keeps only the latest deletion Undo and clears it on the next data mutation', async () => {
    const repository = await repositoryWith(item('invalidate-undo'));
    render(<App repository={repository}/>);
    fireEvent.click((await screen.findAllByLabelText('更多操作'))[0]);
    fireEvent.click(screen.getByRole('button', {name: '刪除 Bookmark'}));
    expect(await screen.findByRole('button', {name: '復原'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '新增分類'}));
    fireEvent.change(screen.getByRole('textbox', {name: '分類名稱'}), {target: {value: '下一個操作'}});
    fireEvent.click(screen.getByRole('button', {name: '新增'}));
    await waitFor(() => expect(screen.queryByRole('button', {name: '復原'})).not.toBeInTheDocument());
  });

  it('creates duplicate category names while Uncategorized has no edit/delete menu', async () => {
    const repository = await repositoryWith(item('category'));
    render(<App repository={repository}/>);
    await screen.findByRole('button', {name: '開啟: 標題'});
    for (let index = 0; index < 2; index += 1) {
      fireEvent.click(screen.getByRole('button', {name: '新增分類'}));
      fireEvent.change(screen.getByRole('textbox', {name: '分類名稱'}), {target: {value: '專案'}});
      fireEvent.click(screen.getByRole('button', {name: '新增'}));
      await waitFor(() => expect(screen.getAllByTitle('專案')).toHaveLength(index + 1));
    }
    expect(screen.getAllByTitle('專案')).toHaveLength(2);
    const firstProjectHeader = screen.getAllByTitle('專案')[0].closest('.category-header')!;
    fireEvent.click(within(firstProjectHeader as HTMLElement).getByLabelText('更多操作'));
    fireEvent.click(within(firstProjectHeader as HTMLElement).getByRole('button', {name: '重新命名'}));
    fireEvent.change(screen.getByRole('textbox', {name: '分類名稱'}), {target: {value: '新名稱'}});
    fireEvent.click(screen.getByRole('button', {name: '儲存'}));
    expect(await screen.findByTitle('新名稱')).toBeInTheDocument();
    const uncategorizedHeader = screen.getByTitle('未分類').closest('.category-header')!;
    expect(within(uncategorizedHeader as HTMLElement).queryByLabelText('更多操作')).not.toBeInTheDocument();
  });

  it('shows a pinned bookmark twice and keeps both displays on one record', async () => {
    const repository = await repositoryWith(item('pin'));
    render(<App repository={repository}/>);
    fireEvent.click(await screen.findByRole('button', {name: '置頂 Bookmark'}));
    expect(await screen.findByRole('heading', {name: /置頂/})).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: '開啟: 標題'})).toHaveLength(2);
    const pinnedMenu = (await screen.findAllByLabelText('更多操作'))[0].parentElement!;
    fireEvent.click(within(pinnedMenu).getByLabelText('更多操作'));
    fireEvent.click(within(pinnedMenu).getByRole('button', {name: '編輯'}));
    fireEvent.change(screen.getByLabelText('標題'), {target: {value: '同步標題'}});
    fireEvent.click(screen.getByRole('button', {name: '儲存'}));
    expect(await screen.findAllByRole('button', {name: '開啟: 同步標題'})).toHaveLength(2);
  });

  it('confirms category deletion with the exact count and restores the group', async () => {
    const bookmark = item('category-delete');
    const repository = await repositoryWith(bookmark);
    await repository.createCategory('技術', {id: 'tech'});
    await repository.moveBookmark(bookmark, 'tech');
    await repository.setCategoryExpanded('tech', true);
    render(<App repository={repository}/>);
    const header = (await screen.findByTitle('技術')).closest('.category-header')!;
    fireEvent.click(within(header as HTMLElement).getByLabelText('更多操作'));
    fireEvent.click(within(header as HTMLElement).getByRole('button', {name: '刪除分類'}));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('這個分類包含 1 筆 Bookmark')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', {name: '取消'}));
    expect(await screen.findByTitle('技術')).toBeInTheDocument();
    const reopenedHeader = screen.getByTitle('技術').closest('.category-header')!;
    fireEvent.click(within(reopenedHeader as HTMLElement).getByLabelText('更多操作'));
    fireEvent.click(within(reopenedHeader as HTMLElement).getByRole('button', {name: '刪除分類'}));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: '確認刪除'}));
    expect(await screen.findByText('已刪除分類與其中的 Bookmark')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '復原'}));
    expect(await screen.findByTitle('技術')).toBeInTheDocument();
  });

  it('searches collapsed notes in a flat result and restores the category view when cleared', async () => {
    const bookmark = item('search', {note: 'Git 規範線索'});
    const repository = await repositoryWith(bookmark);
    await repository.setCategoryExpanded('uncategorized', false);
    render(<App repository={repository}/>);
    expect(screen.queryByRole('button', {name: '開啟: 標題'})).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'git'}});
    expect(await screen.findByRole('button', {name: '開啟: 標題'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: /搜尋結果/})).toBeInTheDocument();
    expect(screen.queryByText(/月份/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: ''}});
    await waitFor(() => expect(screen.queryByRole('button', {name: '開啟: 標題'})).not.toBeInTheDocument());
    expect(screen.getByTitle('未分類')).toHaveAttribute('aria-expanded', 'false');
  });

  it('records lastOpenedAt only after successful navigation', async () => {
    const success = item('success');
    const failed = item('failed', {title: '失敗項目'});
    const repository = await repositoryWith(success, failed);
    const onNavigate = vi.fn(async (bookmark: Bookmark) => bookmark.threadId === 'success');
    render(<App repository={repository} onNavigate={onNavigate}/>);
    fireEvent.click(await screen.findByRole('button', {name: '開啟: 標題'}));
    await waitFor(async () => expect((await repository.getByMessage(success))?.lastOpenedAt).toBeDefined());
    fireEvent.click(screen.getByRole('button', {name: '開啟: 失敗項目'}));
    await screen.findByText('無法跳回這個討論，Bookmark 仍保留。');
    expect((await repository.getByMessage(failed))?.lastOpenedAt).toBeUndefined();
  });

  it('provides named keyboard-focusable drag operations without a move selector', async () => {
    const bookmark = item('accessible');
    const repository = await repositoryWith(bookmark);
    await repository.createCategory('目的地', {id: 'target'});
    render(<App repository={repository}/>);
    expect(await screen.findByRole('button', {name: '拖曳 Bookmark'})).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('button', {name: '拖曳分類'})[0]).toHaveAttribute('title', '拖曳分類');
    fireEvent.click((await screen.findAllByLabelText('更多操作'))[0]);
    expect(screen.queryByRole('combobox', {name: '移到分類'})).not.toBeInTheDocument();
  });

  it('exposes keyboard sorting instructions from dedicated handles', async () => {
    const repository = await repositoryWith(item('keyboard-drag'));
    await repository.createCategory('第一個', {id: 'first'});
    await repository.createCategory('第二個', {id: 'second'});
    render(<App repository={repository}/>);
    await screen.findByTitle('第二個');
    const handles = screen.getAllByRole('button', {name: '拖曳分類'});
    expect(handles.every((handle) => handle.getAttribute('tabindex') === '0')).toBe(true);
    expect(handles.every((handle) => handle.getAttribute('aria-roledescription') === 'sortable')).toBe(true);
  });

  it('does not restore invalid files or a valid file when replacement is cancelled', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter());
    const restore = vi.fn();
    const diagnostics = {backup: vi.fn(), preflight: vi.fn().mockRejectedValueOnce(new Error('invalid')).mockResolvedValueOnce({bookmarks: [sampleBookmark()]}), restore};
    const {container} = render(<App repository={repository} diagnostics={diagnostics as never}/>);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const invalid = new File(['{}'], 'invalid.json', {type: 'application/json'}); Object.defineProperty(invalid, 'text', {value: async () => '{}'});
    fireEvent.change(input, {target: {files: [invalid]}});
    expect(await screen.findByRole('status')).toHaveTextContent('收藏庫沒有變更');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const valid = new File(['{}'], 'valid.json', {type: 'application/json'}); Object.defineProperty(valid, 'text', {value: async () => '{}'});
    fireEvent.change(input, {target: {files: [valid]}});
    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(restore).not.toHaveBeenCalled();
  });
});
