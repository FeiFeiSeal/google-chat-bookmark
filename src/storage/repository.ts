import {bookmarkStorageKey, type MessageIdentity} from '../domain/identity';
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  UNCATEGORIZED_CATEGORY,
  UNCATEGORIZED_ID,
  validateBookmark,
  validateCategory,
  validateMetadata,
  type Bookmark,
  type Category,
  type LibraryData,
  type LibraryView,
  type StorageMetadata,
} from '../domain/schema';
import {migrateLibraryToCurrent} from './migrations';
import type {StorageAdapter, StorageRecord} from './storage-adapter';

export const METADATA_KEY = 'library:metadata';
export const CATEGORY_PREFIX = 'category:';
export const ORDER_PREFIX = 'order:';
export const EXPANDED_CATEGORIES_KEY = 'preference:expanded-categories';

const initialMetadata: StorageMetadata = {
  schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
  revision: 0,
  categoryOrder: [UNCATEGORIZED_ID],
  pinnedOrder: [],
};

export type BookmarkDeletion = {
  type: 'bookmark';
  bookmark: Bookmark;
  bookmarkKey: string;
  categoryIndex: number;
  pinnedIndex: number;
};

export type CategoryDeletion = {
  type: 'category';
  category: Category;
  categoryIndex: number;
  bookmarks: Bookmark[];
  bookmarkOrder: string[];
  pinnedPositions: Array<{key: string; index: number}>;
  wasExpanded: boolean;
};

export type DeletionSnapshot = BookmarkDeletion | CategoryDeletion;

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function bookmarkKey(bookmark: MessageIdentity): string {
  return bookmarkStorageKey(bookmark);
}

function sortNewest(left: Bookmark, right: Bookmark): number {
  return right.createdAt.localeCompare(left.createdAt) || bookmarkKey(left).localeCompare(bookmarkKey(right));
}

function readViewFromRecords(all: StorageRecord): LibraryView {
  const metadata = validateMetadata(all[METADATA_KEY]);
  const storedCategories = Object.entries(all)
    .filter(([key, value]) => key.startsWith(CATEGORY_PREFIX) && value !== null && value !== undefined)
    .map(([, value]) => validateCategory(value));
  const categoryMap = new Map(storedCategories.map((category) => [category.id, category]));
  if (!categoryMap.has(UNCATEGORIZED_ID)) throw new Error('missing-uncategorized');
  const categoryOrder = unique(metadata.categoryOrder.filter((id) => categoryMap.has(id)));
  for (const category of [...storedCategories].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (!categoryOrder.includes(category.id)) categoryOrder.push(category.id);
  }
  const categories = categoryOrder.map((id) => categoryMap.get(id)!);

  const bookmarks = Object.entries(all)
    .filter(([key, value]) => key.startsWith('bookmark:') && value !== null && value !== undefined)
    .map(([, value]) => validateBookmark(value))
    .filter(({categoryId}) => categoryMap.has(categoryId));
  const bookmarkMap = new Map(bookmarks.map((bookmark) => [bookmarkKey(bookmark), bookmark]));
  const orders: Record<string, string[]> = {};
  for (const category of categories) {
    const stored = all[`${ORDER_PREFIX}${category.id}`];
    const listed = Array.isArray(stored) ? unique(stored.filter((key): key is string => typeof key === 'string')) : [];
    const valid = listed.filter((key) => bookmarkMap.get(key)?.categoryId === category.id);
    const missing = bookmarks.filter((bookmark) => bookmark.categoryId === category.id && !valid.includes(bookmarkKey(bookmark))).sort(sortNewest).map(bookmarkKey);
    orders[category.id] = [...valid, ...missing];
  }
  const pinnedOrder = unique(metadata.pinnedOrder).filter((key) => bookmarkMap.get(key)?.pinned);
  const missingPinned = bookmarks.filter((bookmark) => bookmark.pinned && !pinnedOrder.includes(bookmarkKey(bookmark))).sort(sortNewest).map(bookmarkKey);
  const expanded = all[EXPANDED_CATEGORIES_KEY];
  const expandedCategoryIds = Array.isArray(expanded)
    ? unique(expanded.filter((id): id is string => typeof id === 'string' && categoryMap.has(id)))
    : [];

  return {
    metadata: {...metadata, categoryOrder, pinnedOrder: [...pinnedOrder, ...missingPinned]},
    categories,
    bookmarks,
    orders,
    expandedCategoryIds,
  };
}

function withoutPreferences(view: LibraryView): LibraryData {
  return {
    metadata: view.metadata,
    categories: view.categories,
    bookmarks: view.bookmarks,
    orders: view.orders,
  };
}

export class BookmarkRepository {
  isReadOnly = false;

  constructor(readonly storage: StorageAdapter) {}

  async initialize(): Promise<void> {
    let all = await this.storage.get();
    if (Object.keys(all).length === 0) {
      await this.storage.set({
        [METADATA_KEY]: initialMetadata,
        [`${CATEGORY_PREFIX}${UNCATEGORIZED_ID}`]: UNCATEGORIZED_CATEGORY,
        [`${ORDER_PREFIX}${UNCATEGORIZED_ID}`]: [],
        [EXPANDED_CATEGORIES_KEY]: [],
      });
      this.isReadOnly = false;
      return;
    }
    try {
      const metadata = all[METADATA_KEY] as {schemaVersion?: number} | undefined;
      if (metadata?.schemaVersion === 1 || metadata?.schemaVersion === 2) {
        const legacy: Record<string, unknown> = {
          metadata,
          categories: Object.entries(all).filter(([key]) => key.startsWith(CATEGORY_PREFIX)).map(([, value]) => value),
          bookmarks: Object.entries(all).filter(([key]) => key.startsWith('bookmark:')).map(([, value]) => value),
          orders: Object.fromEntries(Object.entries(all).filter(([key]) => key.startsWith(ORDER_PREFIX)).map(([key, value]) => [key.slice(ORDER_PREFIX.length), value])),
        };
        const migrated = migrateLibraryToCurrent(legacy);
        const bookmarkRecords = Object.fromEntries(migrated.bookmarks.map((bookmark) => [bookmarkKey(bookmark), bookmark]));
        const orderRecords = Object.fromEntries(Object.entries(migrated.orders).map(([categoryId, order]) => [`${ORDER_PREFIX}${categoryId}`, order]));
        const oldBookmarkKeys = Object.keys(all).filter((key) => key.startsWith('bookmark:') && !(key in bookmarkRecords));
        await this.storage.set({[METADATA_KEY]: migrated.metadata, ...orderRecords, ...bookmarkRecords, [EXPANDED_CATEGORIES_KEY]: all[EXPANDED_CATEGORIES_KEY] ?? []});
        if (oldBookmarkKeys.length) await this.storage.remove(oldBookmarkKeys);
        all = await this.storage.get();
      }
      readViewFromRecords(all);
      this.isReadOnly = false;
    } catch (error) {
      this.isReadOnly = true;
      throw error;
    }
  }

  private assertWritable(): void {
    if (this.isReadOnly) throw new Error('repository-read-only');
  }

  private async readView(expectedRevision?: number): Promise<LibraryView> {
    const view = readViewFromRecords(await this.storage.get());
    if (expectedRevision !== undefined && view.metadata.revision !== expectedRevision) throw new Error('revision-conflict');
    return view;
  }

  private async commit(view: LibraryView, values: StorageRecord, removals: string[] = []): Promise<void> {
    this.assertWritable();
    const latest = validateMetadata((await this.storage.get(METADATA_KEY))[METADATA_KEY]);
    if (latest.revision !== view.metadata.revision) throw new Error('revision-conflict');
    const metadata = {...(values[METADATA_KEY] as StorageMetadata | undefined ?? view.metadata), schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION, revision: view.metadata.revision + 1};
    const tombstones = Object.fromEntries(removals.map((key) => [key, null]));
    await this.storage.set({...values, ...tombstones, [METADATA_KEY]: metadata});
    if (removals.length) await this.storage.remove(removals);
  }

  async getByMessage(identity: MessageIdentity): Promise<Bookmark | undefined> {
    const key = bookmarkStorageKey(identity);
    const value = (await this.storage.get(key))[key];
    return value === undefined || value === null ? undefined : validateBookmark(value);
  }

  async create(bookmark: Bookmark, expectedRevision?: number): Promise<Bookmark> {
    this.assertWritable();
    const valid = validateBookmark(bookmark);
    const key = bookmarkKey(valid);
    if ((await this.storage.get(key))[key] !== undefined) throw new Error('duplicate-bookmark');
    const view = await this.readView(expectedRevision);
    const orderKey = `${ORDER_PREFIX}${UNCATEGORIZED_ID}`;
    const order = view.orders[UNCATEGORIZED_ID] ?? [];
    await this.commit(view, {[key]: valid, [orderKey]: [key, ...order.filter((item) => item !== key)]});
    return valid;
  }

  async updateBookmark(identity: MessageIdentity, changes: {title: string; note: string}, expectedRevision?: number): Promise<Bookmark> {
    const view = await this.readView(expectedRevision);
    const key = bookmarkStorageKey(identity);
    const current = view.bookmarks.find((bookmark) => bookmarkKey(bookmark) === key);
    if (!current) throw new Error('bookmark-not-found');
    const updated = validateBookmark({...current, ...changes, updatedAt: new Date().toISOString()});
    await this.commit(view, {[key]: updated});
    return updated;
  }

  async markOpened(identity: MessageIdentity, openedAt = new Date(), expectedRevision?: number): Promise<void> {
    const view = await this.readView(expectedRevision);
    const key = bookmarkStorageKey(identity);
    const current = view.bookmarks.find((bookmark) => bookmarkKey(bookmark) === key);
    if (!current) throw new Error('bookmark-not-found');
    const updated = validateBookmark({...current, lastOpenedAt: openedAt.toISOString()});
    await this.commit(view, {[key]: updated});
  }

  async createCategory(name: string, options: {id?: string; now?: Date; expectedRevision?: number} = {}): Promise<Category> {
    const view = await this.readView(options.expectedRevision);
    const timestamp = (options.now ?? new Date()).toISOString();
    const category = validateCategory({id: options.id ?? crypto.randomUUID(), name, createdAt: timestamp, updatedAt: timestamp});
    if (view.categories.some(({id}) => id === category.id)) throw new Error('category-id-conflict');
    const metadata = {...view.metadata, categoryOrder: [...view.metadata.categoryOrder, category.id]};
    await this.commit(view, {[METADATA_KEY]: metadata, [`${CATEGORY_PREFIX}${category.id}`]: category, [`${ORDER_PREFIX}${category.id}`]: []});
    return category;
  }

  async renameCategory(categoryId: string, name: string, expectedRevision?: number): Promise<Category> {
    if (categoryId === UNCATEGORIZED_ID) throw new Error('protected-category');
    const view = await this.readView(expectedRevision);
    const category = view.categories.find(({id}) => id === categoryId);
    if (!category) throw new Error('category-not-found');
    const updated = validateCategory({...category, name, updatedAt: new Date().toISOString()});
    await this.commit(view, {[`${CATEGORY_PREFIX}${categoryId}`]: updated});
    return updated;
  }

  async setCategoryExpanded(categoryId: string, expanded: boolean): Promise<void> {
    this.assertWritable();
    const view = await this.readView();
    if (!view.categories.some(({id}) => id === categoryId)) throw new Error('category-not-found');
    const next = expanded ? unique([...view.expandedCategoryIds, categoryId]) : view.expandedCategoryIds.filter((id) => id !== categoryId);
    await this.storage.set({[EXPANDED_CATEGORIES_KEY]: next});
  }

  async reorderCategories(categoryIds: string[], expectedRevision?: number): Promise<void> {
    const view = await this.readView(expectedRevision);
    if (unique(categoryIds).length !== view.categories.length || !view.categories.every(({id}) => categoryIds.includes(id))) throw new Error('invalid-category-order');
    await this.commit(view, {[METADATA_KEY]: {...view.metadata, categoryOrder: [...categoryIds]}});
  }

  async reorderBookmarks(categoryId: string, keys: string[], expectedRevision?: number): Promise<void> {
    const view = await this.readView(expectedRevision);
    const current = view.orders[categoryId];
    if (!current || unique(keys).length !== current.length || !current.every((key) => keys.includes(key))) throw new Error('invalid-bookmark-order');
    await this.commit(view, {[`${ORDER_PREFIX}${categoryId}`]: [...keys]});
  }

  async moveBookmark(identity: MessageIdentity, targetCategoryId: string, targetIndex = 0, expectedRevision?: number): Promise<void> {
    const view = await this.readView(expectedRevision);
    if (!view.categories.some(({id}) => id === targetCategoryId)) throw new Error('category-not-found');
    const key = bookmarkStorageKey(identity);
    const bookmark = view.bookmarks.find((item) => bookmarkKey(item) === key);
    if (!bookmark) throw new Error('bookmark-not-found');
    const source = view.orders[bookmark.categoryId].filter((item) => item !== key);
    const targetBase = bookmark.categoryId === targetCategoryId ? source : view.orders[targetCategoryId].filter((item) => item !== key);
    const index = Math.max(0, Math.min(targetIndex, targetBase.length));
    const target = [...targetBase.slice(0, index), key, ...targetBase.slice(index)];
    const updated = validateBookmark({...bookmark, categoryId: targetCategoryId, updatedAt: new Date().toISOString()});
    const values: StorageRecord = {[key]: updated, [`${ORDER_PREFIX}${targetCategoryId}`]: target};
    if (bookmark.categoryId !== targetCategoryId) values[`${ORDER_PREFIX}${bookmark.categoryId}`] = source;
    await this.commit(view, values);
  }

  async setPinned(identity: MessageIdentity, pinned: boolean, expectedRevision?: number): Promise<void> {
    const view = await this.readView(expectedRevision);
    const key = bookmarkStorageKey(identity);
    const bookmark = view.bookmarks.find((item) => bookmarkKey(item) === key);
    if (!bookmark) throw new Error('bookmark-not-found');
    const pinnedOrder = pinned ? [key, ...view.metadata.pinnedOrder.filter((item) => item !== key)] : view.metadata.pinnedOrder.filter((item) => item !== key);
    const updated = validateBookmark({...bookmark, pinned, updatedAt: new Date().toISOString()});
    await this.commit(view, {[key]: updated, [METADATA_KEY]: {...view.metadata, pinnedOrder}});
  }

  async reorderPinned(keys: string[], expectedRevision?: number): Promise<void> {
    const view = await this.readView(expectedRevision);
    if (unique(keys).length !== view.metadata.pinnedOrder.length || !view.metadata.pinnedOrder.every((key) => keys.includes(key))) throw new Error('invalid-pinned-order');
    await this.commit(view, {[METADATA_KEY]: {...view.metadata, pinnedOrder: [...keys]}});
  }

  async deleteBookmark(identity: MessageIdentity, expectedRevision?: number): Promise<BookmarkDeletion> {
    const view = await this.readView(expectedRevision);
    const key = bookmarkStorageKey(identity);
    const bookmark = view.bookmarks.find((item) => bookmarkKey(item) === key);
    if (!bookmark) throw new Error('bookmark-not-found');
    const snapshot: BookmarkDeletion = {
      type: 'bookmark', bookmark, bookmarkKey: key,
      categoryIndex: view.orders[bookmark.categoryId].indexOf(key),
      pinnedIndex: view.metadata.pinnedOrder.indexOf(key),
    };
    await this.commit(view, {
      [`${ORDER_PREFIX}${bookmark.categoryId}`]: view.orders[bookmark.categoryId].filter((item) => item !== key),
      [METADATA_KEY]: {...view.metadata, pinnedOrder: view.metadata.pinnedOrder.filter((item) => item !== key)},
    }, [key]);
    return snapshot;
  }

  async deleteCategory(categoryId: string, expectedRevision?: number): Promise<CategoryDeletion> {
    if (categoryId === UNCATEGORIZED_ID) throw new Error('protected-category');
    const view = await this.readView(expectedRevision);
    const category = view.categories.find(({id}) => id === categoryId);
    if (!category) throw new Error('category-not-found');
    const order = view.orders[categoryId];
    const bookmarkMap = new Map(view.bookmarks.map((bookmark) => [bookmarkKey(bookmark), bookmark]));
    const bookmarks = order.map((key) => bookmarkMap.get(key)).filter((value): value is Bookmark => Boolean(value));
    const deletedKeys = new Set(order);
    const snapshot: CategoryDeletion = {
      type: 'category', category, categoryIndex: view.metadata.categoryOrder.indexOf(categoryId), bookmarks,
      bookmarkOrder: [...order],
      pinnedPositions: view.metadata.pinnedOrder.flatMap((key, index) => deletedKeys.has(key) ? [{key, index}] : []),
      wasExpanded: view.expandedCategoryIds.includes(categoryId),
    };
    const metadata = {
      ...view.metadata,
      categoryOrder: view.metadata.categoryOrder.filter((id) => id !== categoryId),
      pinnedOrder: view.metadata.pinnedOrder.filter((key) => !deletedKeys.has(key)),
    };
    await this.commit(view, {
      [METADATA_KEY]: metadata,
      [EXPANDED_CATEGORIES_KEY]: view.expandedCategoryIds.filter((id) => id !== categoryId),
    }, [`${CATEGORY_PREFIX}${categoryId}`, `${ORDER_PREFIX}${categoryId}`, ...order]);
    return snapshot;
  }

  async restoreDeletion(snapshot: DeletionSnapshot, expectedRevision?: number): Promise<void> {
    const view = await this.readView(expectedRevision);
    if (snapshot.type === 'bookmark') {
      if (view.bookmarks.some((bookmark) => bookmarkKey(bookmark) === snapshot.bookmarkKey)) throw new Error('undo-conflict');
      if (!view.categories.some(({id}) => id === snapshot.bookmark.categoryId)) throw new Error('undo-conflict');
      const order = [...view.orders[snapshot.bookmark.categoryId]];
      order.splice(Math.max(0, Math.min(snapshot.categoryIndex, order.length)), 0, snapshot.bookmarkKey);
      const pinnedOrder = [...view.metadata.pinnedOrder];
      if (snapshot.pinnedIndex >= 0) pinnedOrder.splice(Math.min(snapshot.pinnedIndex, pinnedOrder.length), 0, snapshot.bookmarkKey);
      await this.commit(view, {
        [snapshot.bookmarkKey]: snapshot.bookmark,
        [`${ORDER_PREFIX}${snapshot.bookmark.categoryId}`]: order,
        [METADATA_KEY]: {...view.metadata, pinnedOrder},
      });
      return;
    }
    if (view.categories.some(({id}) => id === snapshot.category.id) || snapshot.bookmarks.some((deleted) => view.bookmarks.some((bookmark) => bookmarkKey(bookmark) === bookmarkKey(deleted)))) throw new Error('undo-conflict');
    const categoryOrder = [...view.metadata.categoryOrder];
    categoryOrder.splice(Math.max(0, Math.min(snapshot.categoryIndex, categoryOrder.length)), 0, snapshot.category.id);
    const pinnedOrder = [...view.metadata.pinnedOrder];
    for (const {key, index} of [...snapshot.pinnedPositions].sort((a, b) => a.index - b.index)) pinnedOrder.splice(Math.min(index, pinnedOrder.length), 0, key);
    const expanded = snapshot.wasExpanded ? unique([...view.expandedCategoryIds, snapshot.category.id]) : view.expandedCategoryIds;
    await this.commit(view, {
      [METADATA_KEY]: {...view.metadata, categoryOrder, pinnedOrder},
      [`${CATEGORY_PREFIX}${snapshot.category.id}`]: snapshot.category,
      [`${ORDER_PREFIX}${snapshot.category.id}`]: snapshot.bookmarkOrder,
      [EXPANDED_CATEGORIES_KEY]: expanded,
      ...Object.fromEntries(snapshot.bookmarks.map((bookmark) => [bookmarkKey(bookmark), bookmark])),
    });
  }

  async deleteIfMatches(bookmark: Bookmark): Promise<boolean> {
    this.assertWritable();
    const current = await this.getByMessage(bookmark);
    if (!current || JSON.stringify(current) !== JSON.stringify(bookmark)) return false;
    await this.deleteBookmark(bookmark);
    return true;
  }

  async listUncategorized(): Promise<Bookmark[]> {
    const view = await this.view();
    const bookmarkMap = new Map(view.bookmarks.map((bookmark) => [bookmarkKey(bookmark), bookmark]));
    return view.orders[UNCATEGORIZED_ID].map((key) => bookmarkMap.get(key)).filter((value): value is Bookmark => Boolean(value));
  }

  subscribe(listener: () => void): () => void {
    return this.storage.subscribe((changes) => {
      const entries = Object.entries(changes);
      const tombstoneCleanup = entries.length > 0 && entries.every(([, change]) => change.oldValue === null && change.newValue === undefined);
      if (tombstoneCleanup) return;
      if (entries.some(([key]) => key.startsWith('bookmark:') || key.startsWith(ORDER_PREFIX) || key.startsWith(CATEGORY_PREFIX) || key === METADATA_KEY || key === EXPANDED_CATEGORIES_KEY)) listener();
    });
  }

  async view(): Promise<LibraryView> {
    return this.readView();
  }

  async snapshot(): Promise<LibraryData> {
    return withoutPreferences(await this.readView());
  }
}
