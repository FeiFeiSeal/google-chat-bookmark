import {bookmarkStorageKey, type MessageIdentity} from '../domain/identity';
import {CURRENT_STORAGE_SCHEMA_VERSION, validateLibraryData, type LibraryData} from '../domain/schema';

export interface Migration {
  from: number;
  to: number;
  migrate(data: Record<string, unknown>): Record<string, unknown>;
}

function schemaVersion(data: Record<string, unknown>): number {
  const metadata = data.metadata;
  if (!metadata || typeof metadata !== 'object') return 0;
  const version = (metadata as Record<string, unknown>).schemaVersion;
  return typeof version === 'number' ? version : 0;
}

export function runSequentialMigrations(source: Record<string, unknown>, target: number, migrations: Migration[]): Record<string, unknown> {
  let current = structuredClone(source);
  let version = schemaVersion(current);
  if (version > target) throw new Error('unsupported-storage-version');
  while (version < target) {
    const migration = migrations.find(({from}) => from === version);
    if (!migration || migration.to !== version + 1) throw new Error(`missing-migration-${version}`);
    current = migration.migrate(structuredClone(current));
    const nextVersion = schemaVersion(current);
    if (nextVersion !== migration.to) throw new Error(`invalid-migration-${version}`);
    version = nextVersion;
  }
  return current;
}

export function migrateLibraryV1ToV2(source: unknown): Record<string, unknown> {
  if (!source || typeof source !== 'object') throw new Error('invalid-v1-library');
  const value = structuredClone(source) as Record<string, unknown>;
  const oldMetadata = value.metadata as Record<string, unknown> | undefined;
  if (!oldMetadata || oldMetadata.schemaVersion !== 1) throw new Error('invalid-v1-library');
  value.metadata = {...oldMetadata, schemaVersion: 2, revision: 0};
  return value;
}

export function migrateLibraryV2ToV3(source: unknown): LibraryData {
  if (!source || typeof source !== 'object') throw new Error('invalid-v2-library');
  const value = structuredClone(source) as Record<string, unknown>;
  const oldMetadata = value.metadata as Record<string, unknown> | undefined;
  if (!oldMetadata || oldMetadata.schemaVersion !== 2 || !Array.isArray(value.bookmarks)) throw new Error('invalid-v2-library');
  const keyMap = new Map<string, string>();
  for (const bookmark of value.bookmarks as MessageIdentity[]) {
    keyMap.set(`bookmark:${bookmark.spaceId}:${bookmark.threadId}`, bookmarkStorageKey(bookmark));
  }
  const orders = value.orders && typeof value.orders === 'object' ? value.orders as Record<string, unknown> : {};
  value.orders = Object.fromEntries(Object.entries(orders).map(([categoryId, order]) => [
    categoryId,
    Array.isArray(order) ? order.map((key) => typeof key === 'string' ? keyMap.get(key) ?? key : key) : order,
  ]));
  const pinnedOrder = Array.isArray(oldMetadata.pinnedOrder)
    ? oldMetadata.pinnedOrder.map((key) => typeof key === 'string' ? keyMap.get(key) ?? key : key)
    : [];
  value.metadata = {...oldMetadata, schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION, pinnedOrder};
  const validation = validateLibraryData(value);
  if (!validation.ok) throw new Error(validation.error);
  return validation.value;
}

export function migrateLibraryToCurrent(source: unknown): LibraryData {
  if (!source || typeof source !== 'object') throw new Error('invalid-library');
  const metadata = (source as {metadata?: {schemaVersion?: number}}).metadata;
  const v2 = metadata?.schemaVersion === 1 ? migrateLibraryV1ToV2(source) : source;
  if ((v2 as {metadata?: {schemaVersion?: number}}).metadata?.schemaVersion === 2) return migrateLibraryV2ToV3(v2);
  const validation = validateLibraryData(v2);
  if (!validation.ok) throw new Error(validation.error);
  return validation.value;
}
