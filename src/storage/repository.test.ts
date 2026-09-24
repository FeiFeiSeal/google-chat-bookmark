import {describe, expect, it, vi} from 'vitest';
import {bookmarkStorageKey} from '../domain/identity';
import type {Bookmark} from '../domain/schema';
import {MemoryStorageAdapter} from './storage-adapter';
import {BookmarkRepository} from './repository';

export const sampleBookmark = (messageId = 'message'): Bookmark => ({
  schemaVersion: 1, spaceId: 'space', threadId: 'thread', messageId,
  url: `https://chat.google.com/room/space/thread/${messageId}?cls=10`, title: '標題',
  sourceRoomName: '聊天室', categoryId: 'uncategorized', note: '', pinned: false,
  createdAt: '2026-09-22T00:00:00.000Z', updatedAt: '2026-09-22T00:00:00.000Z',
});

describe('BookmarkRepository', () => {
  it('reads one deterministic message key and writes bookmark plus order in one batch', async () => {
    const adapter = new MemoryStorageAdapter();
    const setSpy = vi.spyOn(adapter, 'set');
    const repository = new BookmarkRepository(adapter);
    await repository.initialize();
    await repository.create(sampleBookmark());
    expect(await repository.getByMessage(sampleBookmark())).toEqual(sampleBookmark());
    expect(setSpy).toHaveBeenLastCalledWith(expect.objectContaining({[bookmarkStorageKey(sampleBookmark())]: sampleBookmark(), 'order:uncategorized': [bookmarkStorageKey(sampleBookmark())]}));
    expect(await repository.listUncategorized()).toEqual([sampleBookmark()]);
    expect((await repository.snapshot()).metadata).toMatchObject({schemaVersion: 3, revision: 1});
  });

  it('allows different messages in one thread and rejects only the same message', async () => {
    const adapter = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(adapter);
    await repository.initialize();
    await repository.create(sampleBookmark());
    await repository.create(sampleBookmark('other'));
    await expect(repository.create(sampleBookmark('other'))).rejects.toThrow('duplicate-bookmark');
    expect(await repository.listUncategorized()).toHaveLength(2);
  });

  it('notifies a view when local storage changes', () => {
    const adapter = new MemoryStorageAdapter();
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);
    void adapter.set({anything: true});
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
