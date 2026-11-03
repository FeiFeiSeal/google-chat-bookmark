import {describe, expect, it} from 'vitest';
import {createBackup} from './backup';
import {RestoreCoordinator} from './restore';
import {BookmarkRepository} from '../storage/repository';
import {MemoryStorageAdapter} from '../storage/storage-adapter';
import {sampleBookmark} from '../storage/repository.test';
import {sampleLibrary} from './backup.test';

describe('safe restore', () => {
  it('preflights before mutation and replaces after explicit restore', async () => {
    const storage = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(storage);
    await repository.initialize();
    const coordinator = new RestoreCoordinator(storage, repository, 10_000_000);
    const candidate = await coordinator.preflight(JSON.stringify(createBackup(sampleLibrary())));
    expect(await repository.listUncategorized()).toEqual([]);
    await coordinator.restore(candidate);
    expect(await repository.listUncategorized()).toEqual([sampleBookmark()]);
  });

  it('rejects invalid input and insufficient temporary space before writes', async () => {
    const storage = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(storage);
    await repository.initialize();
    const before = storage.writeCount;
    await expect(new RestoreCoordinator(storage, repository, 1).preflight(JSON.stringify(createBackup(sampleLibrary())))).rejects.toThrow('insufficient-storage');
    await expect(new RestoreCoordinator(storage, repository).preflight('{}')).rejects.toThrow();
    expect(storage.writeCount).toBe(before);
  });

  it('restores a valid backup when existing metadata cannot be read', async () => {
    const original = {'library:metadata': {schemaVersion: 99}, 'category:uncategorized': {id: 'uncategorized'}, 'bookmark:unreadable': {title: 'preserve until confirmation'}};
    const storage = new MemoryStorageAdapter(original);
    const repository = new BookmarkRepository(storage);
    await expect(repository.initialize()).rejects.toThrow('invalid-metadata');
    const coordinator = new RestoreCoordinator(storage, repository);
    const before = storage.writeCount;
    const candidate = await coordinator.preflight(JSON.stringify(createBackup(sampleLibrary())));
    expect(storage.writeCount).toBe(before);
    await coordinator.restore(candidate);
    await repository.initialize();
    expect(repository.isReadOnly).toBe(false);
    expect((await repository.snapshot()).bookmarks).toEqual([sampleBookmark()]);
    expect((await storage.get())['bookmark:unreadable']).toBeUndefined();
  });

  it('recovers raw unreadable records if an interrupted restore has an invalid candidate', async () => {
    const original = {'library:metadata': {schemaVersion: 99}, 'bookmark:unreadable': {title: 'original'}};
    const storage = new MemoryStorageAdapter(original);
    const repository = new BookmarkRepository(storage);
    const coordinator = new RestoreCoordinator(storage, repository);
    await coordinator.stageForTest({invalid: true} as never, {kind: 'raw-records', records: original});
    await storage.set({'library:metadata': sampleLibrary().metadata});
    expect(await coordinator.recoverInterruptedRestore()).toBe('recovered');
    expect(await storage.get()).toEqual(original);
  });

  it('finishes a valid candidate after interruption', async () => {
    const storage = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(storage);
    await repository.initialize();
    const coordinator = new RestoreCoordinator(storage, repository);
    await coordinator.stageForTest(sampleLibrary(), await repository.snapshot());
    await coordinator.recoverInterruptedRestore();
    expect(await repository.listUncategorized()).toEqual([sampleBookmark()]);
  });

  it('restores recovery data when the staged candidate is invalid', async () => {
    const storage = new MemoryStorageAdapter();
    const repository = new BookmarkRepository(storage);
    await repository.initialize();
    await repository.create(sampleBookmark());
    const coordinator = new RestoreCoordinator(storage, repository);
    await coordinator.stageForTest({invalid: true} as never, await repository.snapshot());
    await coordinator.recoverInterruptedRestore();
    expect(await repository.listUncategorized()).toEqual([sampleBookmark()]);
  });
});
