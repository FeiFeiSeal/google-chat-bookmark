import {describe, expect, it} from 'vitest';
import {BookmarkRepository} from './repository';
import {MemoryStorageAdapter} from './storage-adapter';
import {UndoManager} from './undo';
import {sampleBookmark} from './repository.test';

describe('single operation undo', () => {
  it('removes only the matching latest creation', async () => {
    const local = new MemoryStorageAdapter();
    const session = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(local);
    await repository.initialize();
    const bookmark = sampleBookmark();
    await repository.create(bookmark);
    const undo = new UndoManager(session, repository);
    const token = await undo.recordCreation(bookmark);
    expect(await undo.undo(token)).toBe(true);
    expect(await repository.listUncategorized()).toEqual([]);
    expect(await undo.undo(token)).toBe(false);
  });

  it('invalidates the old token after another mutation or record mismatch', async () => {
    const local = new MemoryStorageAdapter();
    const session = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(local);
    await repository.initialize();
    await repository.create(sampleBookmark());
    const undo = new UndoManager(session, repository);
    const old = await undo.recordCreation(sampleBookmark());
    await undo.invalidate();
    expect(await undo.undo(old)).toBe(false);
  });
});
