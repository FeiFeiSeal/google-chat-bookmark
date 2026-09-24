import {describe, expect, it} from 'vitest';
import {MemoryStorageAdapter} from './storage-adapter';
import {BookmarkRepository} from './repository';
import {runSequentialMigrations} from './migrations';
import {sampleBookmark} from './repository.test';
import {UNCATEGORIZED_CATEGORY} from '../domain/schema';
import {bookmarkStorageKey} from '../domain/identity';

describe('storage migrations', () => {
  it('initializes v3 and does not rewrite current data', async () => {
    const adapter = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(adapter);
    await repository.initialize();
    const before = adapter.writeCount;
    await repository.initialize();
    expect(adapter.writeCount).toBe(before);
  });

  it('migrates stored v1 metadata without changing bookmark identity or order', async () => {
    const bookmark = sampleBookmark();
    const adapter = new MemoryStorageAdapter({
      'library:metadata': {schemaVersion: 1, categoryOrder: ['uncategorized'], pinnedOrder: []},
      'category:uncategorized': UNCATEGORIZED_CATEGORY,
      'order:uncategorized': ['bookmark:space:thread'],
      'bookmark:space:thread': bookmark,
    });
    const repository = new BookmarkRepository(adapter);
    await repository.initialize();
    expect(await repository.listUncategorized()).toEqual([bookmark]);
    expect((await repository.snapshot()).metadata).toMatchObject({schemaVersion: 3, revision: 0});
    expect((await adapter.get())['bookmark:space:thread:message']).toEqual(bookmark);
    expect((await adapter.get())['bookmark:space:thread']).toBeUndefined();
  });

  it('migrates v2 bookmark, category order and pinned references to message keys', async () => {
    const bookmark = {...sampleBookmark('reply'), categoryId: 'project', pinned: true};
    const project = {id: 'project', name: '專案', createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z'};
    const oldKey = 'bookmark:space:thread';
    const adapter = new MemoryStorageAdapter({
      'library:metadata': {schemaVersion: 2, revision: 7, categoryOrder: ['uncategorized', 'project'], pinnedOrder: [oldKey]},
      'category:uncategorized': UNCATEGORIZED_CATEGORY,
      'category:project': project,
      'order:uncategorized': [],
      'order:project': [oldKey],
      [oldKey]: bookmark,
      'preference:expanded-categories': ['project'],
    });
    const repository = new BookmarkRepository(adapter);
    await repository.initialize();
    const key = bookmarkStorageKey(bookmark);
    const view = await repository.view();
    expect(view.metadata).toMatchObject({schemaVersion: 3, revision: 7, categoryOrder: ['uncategorized', 'project'], pinnedOrder: [key]});
    expect(view.orders.project).toEqual([key]);
    expect(view.expandedCategoryIds).toEqual(['project']);
    expect((await adapter.get())[oldKey]).toBeUndefined();
    expect(await repository.getByMessage(bookmark)).toEqual(bookmark);
  });

  it('runs supported migrations in sequence without mutating input', () => {
    const original = {metadata: {schemaVersion: 0}, value: 'old'};
    const migrated = runSequentialMigrations(original, 2, [
      {from: 0, to: 1, migrate: (data) => ({...data, metadata: {schemaVersion: 1}, first: true})},
      {from: 1, to: 2, migrate: (data) => ({...data, metadata: {schemaVersion: 2}, second: true})},
    ]);
    expect(migrated).toMatchObject({metadata: {schemaVersion: 2}, first: true, second: true});
    expect(original.metadata.schemaVersion).toBe(0);
  });

  it('keeps original data and enters read-only state when initialization fails', async () => {
    const raw = {metadata: {schemaVersion: 99}, valuable: 'keep'};
    const adapter = new MemoryStorageAdapter(raw);
    const repository = new BookmarkRepository(adapter);
    await expect(repository.initialize()).rejects.toThrow();
    expect(repository.isReadOnly).toBe(true);
    expect(await adapter.get()).toEqual(raw);
  });
});
