import {CURRENT_STORAGE_SCHEMA_VERSION, validateLibraryData, type LibraryData} from '../domain/schema';
import {migrateLibraryToCurrent} from '../storage/migrations';

export const LOCAL_BACKUP_FORMAT = 'google-chat-bookmark-local-backup' as const;
export const LOCAL_BACKUP_FORMAT_VERSION = 1 as const;

export interface LocalBackup {
  format: typeof LOCAL_BACKUP_FORMAT;
  formatVersion: typeof LOCAL_BACKUP_FORMAT_VERSION;
  storageSchemaVersion: typeof CURRENT_STORAGE_SCHEMA_VERSION;
  exportedAt: string;
  library: LibraryData;
}

export function createBackup(library: LibraryData, now = new Date()): LocalBackup {
  const validation = validateLibraryData(library);
  if (!validation.ok) throw new Error(validation.error);
  return {
    format: LOCAL_BACKUP_FORMAT,
    formatVersion: LOCAL_BACKUP_FORMAT_VERSION,
    storageSchemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    library: structuredClone(validation.value),
  };
}

export function parseBackup(json: string): LocalBackup {
  let candidate: unknown;
  try { candidate = JSON.parse(json); } catch { throw new Error('invalid-backup-json'); }
  if (!candidate || typeof candidate !== 'object') throw new Error('invalid-backup');
  const backup = candidate as Partial<Omit<LocalBackup, 'storageSchemaVersion' | 'library'>> & {storageSchemaVersion?: number; library?: unknown};
  if (backup.format !== LOCAL_BACKUP_FORMAT) throw new Error('invalid-backup-format');
  if (backup.formatVersion !== LOCAL_BACKUP_FORMAT_VERSION || ![1, 2, CURRENT_STORAGE_SCHEMA_VERSION].includes(backup.storageSchemaVersion ?? -1)) throw new Error('unsupported-backup-version');
  if (typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))) throw new Error('invalid-export-time');
  const library = backup.storageSchemaVersion === CURRENT_STORAGE_SCHEMA_VERSION ? backup.library : migrateLibraryToCurrent(backup.library);
  const validation = validateLibraryData(library);
  if (!validation.ok) throw new Error(validation.error);
  return {...backup, storageSchemaVersion: CURRENT_STORAGE_SCHEMA_VERSION, library: validation.value} as LocalBackup;
}

export function createBackupDownload(library: LibraryData, now = new Date()): {filename: string; json: string} {
  const backup = createBackup(library, now);
  return {filename: `google-chat-bookmark-backup-${now.toISOString().slice(0, 10)}.json`, json: `${JSON.stringify(backup, null, 2)}\n`};
}

export function downloadBackup(library: LibraryData, now = new Date()): void {
  const {filename, json} = createBackupDownload(library, now);
  const url = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
