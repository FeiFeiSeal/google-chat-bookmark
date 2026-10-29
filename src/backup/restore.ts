import {bookmarkStorageKey} from '../domain/identity';
import {validateLibraryData, type LibraryData} from '../domain/schema';
import {CATEGORY_PREFIX, EXPANDED_CATEGORIES_KEY, METADATA_KEY, ORDER_PREFIX, BookmarkRepository} from '../storage/repository';
import type {StorageAdapter, StorageRecord} from '../storage/storage-adapter';
import {parseBackup} from './backup';

const RECOVERY_KEY = 'restore:recovery';
const CANDIDATE_KEY = 'restore:candidate';
const MARKER_KEY = 'restore:marker';
const DEFAULT_QUOTA_BYTES = 10 * 1024 * 1024;
type RawRecovery = {kind: 'raw-records'; records: StorageRecord};

function isRawRecovery(value: unknown): value is RawRecovery {
  return Boolean(value) && typeof value === 'object' && (value as RawRecovery).kind === 'raw-records'
    && Boolean((value as RawRecovery).records) && typeof (value as RawRecovery).records === 'object'
    && !Array.isArray((value as RawRecovery).records);
}

function productKeys(records: StorageRecord): string[] {
  return Object.keys(records).filter((key) => key === METADATA_KEY || key === EXPANDED_CATEGORIES_KEY || key.startsWith(CATEGORY_PREFIX) || key.startsWith(ORDER_PREFIX) || key.startsWith('bookmark:'));
}

function productRecord(library: LibraryData): Record<string, unknown> {
  return {
    [METADATA_KEY]: library.metadata,
    ...Object.fromEntries(library.categories.map((category) => [`${CATEGORY_PREFIX}${category.id}`, category])),
    ...Object.fromEntries(Object.entries(library.orders).map(([id, order]) => [`${ORDER_PREFIX}${id}`, order])),
    ...Object.fromEntries(library.bookmarks.map((bookmark) => [bookmarkStorageKey(bookmark), bookmark])),
  };
}

function estimatedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export class RestoreCoordinator {
  constructor(private readonly storage: StorageAdapter, private readonly repository: BookmarkRepository, private readonly quotaBytes = DEFAULT_QUOTA_BYTES) {}

  async preflight(json: string): Promise<LibraryData> {
    const backup = parseBackup(json);
    const current = await this.storage.get();
    const currentBytes = await this.storage.getBytesInUse();
    const temporaryBytes = estimatedBytes({recovery: current, candidate: backup.library, marker: true});
    if (currentBytes + temporaryBytes > this.quotaBytes) throw new Error('insufficient-storage');
    return backup.library;
  }

  async restore(candidate: LibraryData): Promise<void> {
    const validation = validateLibraryData(candidate);
    if (!validation.ok) throw new Error(validation.error);
    const current = await this.storage.get();
    const records = Object.fromEntries(Object.entries(current).filter(([key]) => ![RECOVERY_KEY, CANDIDATE_KEY, MARKER_KEY].includes(key)));
    await this.stageForTest(validation.value, {kind: 'raw-records', records});
    await this.applyLibrary(validation.value);
    await this.clearStage();
  }

  async stageForTest(candidate: LibraryData, recovery: LibraryData | RawRecovery): Promise<void> {
    await this.storage.set({[RECOVERY_KEY]: recovery, [CANDIDATE_KEY]: candidate, [MARKER_KEY]: {startedAt: new Date().toISOString()}});
  }

  async recoverInterruptedRestore(): Promise<'none' | 'completed' | 'recovered'> {
    const staged = await this.storage.get([MARKER_KEY, CANDIDATE_KEY, RECOVERY_KEY]);
    if (!staged[MARKER_KEY]) return 'none';
    const candidate = validateLibraryData(staged[CANDIDATE_KEY]);
    if (candidate.ok) {
      await this.applyLibrary(candidate.value);
      await this.clearStage();
      return 'completed';
    }
    if (isRawRecovery(staged[RECOVERY_KEY])) {
      await this.applyRawRecords(staged[RECOVERY_KEY].records);
    } else {
      const recovery = validateLibraryData(staged[RECOVERY_KEY]);
      if (!recovery.ok) throw new Error('restore-recovery-invalid');
      await this.applyLibrary(recovery.value);
    }
    await this.clearStage();
    return 'recovered';
  }

  private async applyLibrary(library: LibraryData): Promise<void> {
    const current = await this.storage.get();
    const keys = productKeys(current);
    if (keys.length) await this.storage.remove(keys);
    await this.storage.set({...productRecord(library), [EXPANDED_CATEGORIES_KEY]: []});
  }

  private async applyRawRecords(records: StorageRecord): Promise<void> {
    const keys = productKeys(await this.storage.get());
    if (keys.length) await this.storage.remove(keys);
    await this.storage.set(records);
  }

  private async clearStage(): Promise<void> {
    await this.storage.remove([RECOVERY_KEY, CANDIDATE_KEY, MARKER_KEY]);
  }
}
