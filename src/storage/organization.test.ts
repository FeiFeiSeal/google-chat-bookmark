import {describe, expect, it, vi} from 'vitest';
import {bookmarkStorageKey} from '../domain/identity';
import {UNCATEGORIZED_CATEGORY, type Bookmark} from '../domain/schema';
import {BookmarkRepository} from './repository';
import {MemoryStorageAdapter} from './storage-adapter';
import {sampleBookmark} from './repository.test';

function bookmark(threadId: string, createdAt = '2026-09-22T00:00:00.000Z'): Bookmark {
  return {
    ...sampleBookmark(threadId),
    threadId,
    messageId: `message-${threadId}`,
    url: `https://chat.google.com/room/space/${threadId}/message-${threadId}?cls=10`,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('personal organization repository', () => {
  it('normalizes stale and missing order entries with newest missing bookmarks first', async () => {
    const older = bookmark('older', '2026-09-20T00:00:00.000Z');
    const newer = bookmark('newer', '2026-09-21T00:00:00.000Z');
    const storage = new MemoryStorageAdapter({
      'library:metadata': {schemaVersion: 3, revision: 4, categoryOrder: ['uncategorized'], pinnedOrder: ['bookmark:missing:value']},
      'category:uncategorized': UNCATEGORIZED_CATEGORY,
      'order:uncategorized': ['bookmark:missing:value'],
      [bookmarkStorageKey(older)]: older,
      [bookmarkStorageKey(newer)]: newer,
      'preference:expanded-categories': ['missing'],
    });
    const view = await new BookmarkRepository(storage).view();
    expect(view.orders.uncategorized).toEqual([bookmarkStorageKey(newer), bookmarkStorageKey(older)]);
    expect(view.metadata.pinnedOrder).toEqual([]);
    expect(view.expandedCategoryIds).toEqual([]);
  });

  it('updates only editable bookmark fields and records a valid opened time', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter());
    await repository.initialize();
    const original = bookmark('edit');
    await repository.create(original);
    const revision = (await repository.view()).metadata.revision;
    const updated = await repository.updateBookmark(original, {title: '新標題', note: '新筆記'}, revision);
    expect(updated).toMatchObject({title: '新標題', note: '新筆記', spaceId: original.spaceId, threadId: original.threadId, messageId: original.messageId, categoryId: original.categoryId});
    await repository.markOpened(original, new Date('2026-09-23T01:02:03Z'));
    expect((await repository.getByMessage(original))?.lastOpenedAt).toBe('2026-09-23T01:02:03.000Z');
  });

  it('allows duplicate category names, persists expansion, and protects Uncategorized', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter());
    await repository.initialize();
    const first = await repository.createCategory('專案', {id: 'category-a'});
    const second = await repository.createCategory('專案', {id: 'category-b'});
    expect(first.id).not.toBe(second.id);
    expect((await repository.view()).metadata.categoryOrder).toEqual(['uncategorized', 'category-a', 'category-b']);
    expect((await repository.view()).expandedCategoryIds).toEqual([]);
    await repository.setCategoryExpanded(first.id, true);
    expect((await repository.view()).expandedCategoryIds).toEqual(['category-a']);
    await expect(repository.renameCategory('uncategorized', '其他')).rejects.toThrow('protected-category');
  });

  it('reorders categories, moves bookmarks atomically, and keeps pin order independent', async () => {
    const storage = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(storage);
    await repository.initialize();
    const item = bookmark('move');
    await repository.create(item);
    await repository.createCategory('專案', {id: 'project'});
    const writesBeforeReorder = storage.writeCount;
    await repository.reorderCategories(['project', 'uncategorized']);
    expect(storage.writeCount).toBe(writesBeforeReorder + 1);
    await repository.moveBookmark(item, 'project', 0);
    await repository.setPinned(item, true);
    let view = await repository.view();
    expect(view.metadata.categoryOrder).toEqual(['project', 'uncategorized']);
    expect(view.orders.uncategorized).toEqual([]);
    expect(view.orders.project).toEqual([bookmarkStorageKey(item)]);
    expect(view.metadata.pinnedOrder).toEqual([bookmarkStorageKey(item)]);
    await repository.setPinned(item, false);
    view = await repository.view();
    expect(view.orders.project).toEqual([bookmarkStorageKey(item)]);
    expect(view.metadata.pinnedOrder).toEqual([]);
  });

  it('creates a bookmark directly in its selected category order', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter());
    await repository.initialize();
    await repository.createCategory('專案', {id: 'project'});
    const item = {...bookmark('direct-category'), categoryId: 'project'};
    await repository.create(item);
    const view = await repository.view();
    expect(view.orders.uncategorized).toEqual([]);
    expect(view.orders.project).toEqual([bookmarkStorageKey(item)]);
    expect(view.bookmarks[0].categoryId).toBe('project');
  });

  it('reorders bookmarks and pinned entries without changing category identity', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter());
    await repository.initialize();
    const first = bookmark('order-first');
    const second = bookmark('order-second');
    await repository.create(first);
    await repository.create(second);
    const firstKey = bookmarkStorageKey(first);
    const secondKey = bookmarkStorageKey(second);
    await repository.moveBookmark(first, 'uncategorized', 0);
    expect((await repository.view()).orders.uncategorized).toEqual([firstKey, secondKey]);
    await repository.reorderBookmarks('uncategorized', [secondKey, firstKey]);
    await repository.reorderBookmarks('uncategorized', [firstKey, secondKey]);
    await repository.setPinned(first, true);
    await repository.setPinned(second, true);
    await repository.reorderPinned([firstKey, secondKey]);
    const view = await repository.view();
    expect(view.orders.uncategorized).toEqual([firstKey, secondKey]);
    expect(view.metadata.pinnedOrder).toEqual([firstKey, secondKey]);
    expect(view.bookmarks.every(({categoryId}) => categoryId === 'uncategorized')).toBe(true);
  });

  it('rejects a stale revision and emits one logical notification for tombstone deletion', async () => {
    const storage = new MemoryStorageAdapter();
    const first = new BookmarkRepository(storage);
    const second = new BookmarkRepository(storage);
    await first.initialize();
    const item = bookmark('conflict');
    await first.create(item);
    const stale = (await second.view()).metadata.revision;
    await first.updateBookmark(item, {title: '先寫入', note: ''}, stale);
    await expect(second.updateBookmark(item, {title: '後寫入', note: ''}, stale)).rejects.toThrow('revision-conflict');
    const listener = vi.fn();
    const unsubscribe = second.subscribe(listener);
    await first.deleteBookmark(item);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(await first.getByMessage(item)).toBeUndefined();
  });

  it('restores one deleted bookmark with its category and pinned positions', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter());
    await repository.initialize();
    const first = bookmark('first');
    const second = bookmark('second');
    await repository.create(first);
    await repository.create(second);
    await repository.setPinned(first, true);
    const deletion = await repository.deleteBookmark(first);
    expect(await repository.getByMessage(first)).toBeUndefined();
    await repository.restoreDeletion(deletion);
    const view = await repository.view();
    expect(view.orders.uncategorized).toContain(bookmarkStorageKey(first));
    expect(view.metadata.pinnedOrder).toEqual([bookmarkStorageKey(first)]);
  });

  it('deletes and restores a category, bookmarks, order, pins, and expansion as one group', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter());
    await repository.initialize();
    const first = bookmark('category-first');
    const second = bookmark('category-second');
    await repository.create(first);
    await repository.create(second);
    await repository.createCategory('技術', {id: 'tech'});
    await repository.moveBookmark(first, 'tech');
    await repository.moveBookmark(second, 'tech');
    await repository.setPinned(first, true);
    await repository.setCategoryExpanded('tech', true);
    const deletion = await repository.deleteCategory('tech');
    let view = await repository.view();
    expect(view.categories.map(({id}) => id)).not.toContain('tech');
    expect(view.bookmarks).toHaveLength(0);
    await repository.restoreDeletion(deletion);
    view = await repository.view();
    expect(view.categories.map(({id}) => id)).toContain('tech');
    expect(view.orders.tech).toEqual(deletion.bookmarkOrder);
    expect(view.metadata.pinnedOrder).toContain(bookmarkStorageKey(first));
    expect(view.expandedCategoryIds).toContain('tech');
  });

  it('rejects a conflicting Undo without partially restoring data', async () => {
    const storage = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(storage);
    await repository.initialize();
    const item = bookmark('undo-conflict');
    await repository.create(item);
    const deletion = await repository.deleteBookmark(item);
    await repository.create(item);
    const before = await repository.snapshot();
    await expect(repository.restoreDeletion(deletion)).rejects.toThrow('undo-conflict');
    expect(await repository.snapshot()).toEqual(before);
  });
});
