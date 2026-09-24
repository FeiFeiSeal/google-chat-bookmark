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
