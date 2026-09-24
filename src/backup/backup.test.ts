import {describe, expect, it} from 'vitest';
import {createBackup, createBackupDownload, parseBackup} from './backup';
import {UNCATEGORIZED_CATEGORY, type LibraryData} from '../domain/schema';
import {sampleBookmark} from '../storage/repository.test';

export const sampleLibrary = (): LibraryData => ({
  metadata: {schemaVersion: 3, revision: 0, categoryOrder: ['uncategorized'], pinnedOrder: []},
  categories: [UNCATEGORIZED_CATEGORY], bookmarks: [sampleBookmark()],
  orders: {uncategorized: ['bookmark:space:thread:message']},
});

describe('local diagnostic backup', () => {
  it('serializes all persistent library data without session state', () => {
    const backup = createBackup(sampleLibrary(), new Date('2026-09-22T01:02:03Z'));
    expect(backup).toMatchObject({format: 'google-chat-bookmark-local-backup', formatVersion: 1, storageSchemaVersion: 3, exportedAt: '2026-09-22T01:02:03.000Z'});
    expect(backup.library).toEqual(sampleLibrary());
    expect(JSON.stringify(backup)).not.toContain('undo');
    expect(JSON.stringify(backup)).not.toContain('expandedCategoryIds');
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it('creates a dated JSON download', () => {
    const download = createBackupDownload(sampleLibrary(), new Date('2026-09-22T01:02:03Z'));
    expect(download.filename).toBe('google-chat-bookmark-backup-2026-09-22.json');
    expect(parseBackup(download.json).format).toBe('google-chat-bookmark-local-backup');
  });

  it.each(['{}', '{broken', JSON.stringify({...createBackup(sampleLibrary()), formatVersion: 999})])('rejects invalid or unsupported input', (value) => expect(() => parseBackup(value)).toThrow());

  it('migrates a valid v1 diagnostic backup in memory', () => {
    const old = createBackup(sampleLibrary());
    const legacy = {...old, storageSchemaVersion: 1, library: {...old.library, metadata: {schemaVersion: 1, categoryOrder: ['uncategorized'], pinnedOrder: []}, orders: {uncategorized: ['bookmark:space:thread']}}};
    expect(parseBackup(JSON.stringify(legacy)).library.metadata).toMatchObject({schemaVersion: 3, revision: 0});
  });
});
