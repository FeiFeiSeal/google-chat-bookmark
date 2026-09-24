import {bookmarkStorageKey, buildCanonicalChatUrl, isMessageIdentity, type MessageIdentity} from './identity';
import {graphemeLength} from './title';

export const CURRENT_STORAGE_SCHEMA_VERSION = 3 as const;
export const UNCATEGORIZED_ID = 'uncategorized' as const;

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const UNCATEGORIZED_CATEGORY: Category = {
  id: UNCATEGORIZED_ID,
  name: '未分類',
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
};

export interface Bookmark extends MessageIdentity {
  schemaVersion: 1;
  url: string;
  title: string;
  sourceRoomName: string;
  categoryId: string;
  note: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
}

export interface StorageMetadata {
  schemaVersion: typeof CURRENT_STORAGE_SCHEMA_VERSION;
  revision: number;
  categoryOrder: string[];
  pinnedOrder: string[];
}

export interface LibraryData {
  metadata: StorageMetadata;
  categories: Category[];
  bookmarks: Bookmark[];
  orders: Record<string, string[]>;
}

export interface LibraryView extends LibraryData {
  expandedCategoryIds: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function isSafeText(value: unknown, maximum: number, allowEmpty = false): value is string {
  return typeof value === 'string' && (allowEmpty || value.trim().length > 0) && graphemeLength(value) <= maximum && !/<\/?script\b|javascript:/iu.test(value);
}

export function validateBookmark(value: unknown): Bookmark {
  if (!isPlainObject(value) || value.schemaVersion !== 1 || !isMessageIdentity(value)) throw new Error('invalid-bookmark-identity');
  if (!isSafeText(value.title, 30) || !isSafeText(value.sourceRoomName, 200) || !isSafeText(value.note, 500, true)) throw new Error('invalid-bookmark-text');
  if (typeof value.categoryId !== 'string' || !value.categoryId || typeof value.pinned !== 'boolean') throw new Error('invalid-bookmark-state');
  if (!isIsoDate(value.createdAt) || !isIsoDate(value.updatedAt) || (value.lastOpenedAt !== undefined && !isIsoDate(value.lastOpenedAt))) throw new Error('invalid-bookmark-time');
  if (value.url !== buildCanonicalChatUrl(value)) throw new Error('invalid-bookmark-url');
  return value as unknown as Bookmark;
}

export function validateCategory(value: unknown): Category {
  if (!isPlainObject(value) || typeof value.id !== 'string' || !value.id || !isSafeText(value.name, 30)) throw new Error('invalid-category');
  if (!isIsoDate(value.createdAt) || !isIsoDate(value.updatedAt)) throw new Error('invalid-category-time');
  return value as unknown as Category;
}

export function validateMetadata(value: unknown): StorageMetadata {
  if (!isPlainObject(value) || value.schemaVersion !== CURRENT_STORAGE_SCHEMA_VERSION) throw new Error('invalid-metadata');
  if (!Number.isSafeInteger(value.revision) || (value.revision as number) < 0) throw new Error('invalid-metadata-revision');
  if (!Array.isArray(value.categoryOrder) || !value.categoryOrder.every((id) => typeof id === 'string')) throw new Error('invalid-category-order');
  if (!Array.isArray(value.pinnedOrder) || !value.pinnedOrder.every((id) => typeof id === 'string')) throw new Error('invalid-pinned-order');
  return value as unknown as StorageMetadata;
}

export function validateLibraryData(value: unknown): {ok: true; value: LibraryData} | {ok: false; error: string} {
  try {
    if (!isPlainObject(value) || !Array.isArray(value.categories) || !Array.isArray(value.bookmarks) || !isPlainObject(value.orders)) throw new Error('invalid-library-shape');
    const metadata = validateMetadata(value.metadata);
    const categories = value.categories.map(validateCategory);
    const bookmarks = value.bookmarks.map(validateBookmark);
    const categoryIds = new Set(categories.map(({id}) => id));
    const bookmarkKeys = new Set(bookmarks.map(bookmarkStorageKey));
    if (!categoryIds.has(UNCATEGORIZED_ID) || !metadata.categoryOrder.every((id) => categoryIds.has(id))) throw new Error('invalid-category-reference');
    if (!Object.values(value.orders).every((order) => Array.isArray(order) && order.every((key) => typeof key === 'string'))) throw new Error('invalid-order');
    if (!bookmarks.every(({categoryId}) => categoryIds.has(categoryId))) throw new Error('invalid-bookmark-category');
    if (!metadata.pinnedOrder.every((key) => bookmarkKeys.has(key))) throw new Error('invalid-pinned-reference');
    return {ok: true, value: {metadata, categories, bookmarks, orders: value.orders as Record<string, string[]>}};
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : 'invalid-library'};
  }
}
