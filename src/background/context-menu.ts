import type {Category} from '../domain/schema';

export const QUICK_SAVE_MENU_ID = 'google-chat-bookmark-save';
export const SAVE_TO_CATEGORY_MENU_ID = 'google-chat-bookmark-save-to-category';
const CATEGORY_MENU_PREFIX = 'google-chat-bookmark-category:';
const CHAT_DOCUMENT_PATTERNS = ['https://chat.google.com/*'];

export function categoryMenuId(categoryId: string): string {
  return `${CATEGORY_MENU_PREFIX}${encodeURIComponent(categoryId)}`;
}

export function categoryIdFromMenuId(menuItemId: string | number): string | null {
  if (typeof menuItemId !== 'string' || !menuItemId.startsWith(CATEGORY_MENU_PREFIX)) return null;
  try {
    const categoryId = decodeURIComponent(menuItemId.slice(CATEGORY_MENU_PREFIX.length));
    return categoryId || null;
  } catch {
    return null;
  }
}

function displayNames(categories: Category[]): Map<string, string> {
  const totals = new Map<string, number>();
  const occurrences = new Map<string, number>();
  for (const category of categories) totals.set(category.name, (totals.get(category.name) ?? 0) + 1);
  return new Map(categories.map((category) => {
    const occurrence = (occurrences.get(category.name) ?? 0) + 1;
    occurrences.set(category.name, occurrence);
    const total = totals.get(category.name) ?? 1;
    return [category.id, total > 1 ? `${category.name}（第 ${occurrence} 個）` : category.name];
  }));
}

export function buildBookmarkContextMenuEntries(categories: Category[]): chrome.contextMenus.CreateProperties[] {
  const names = displayNames(categories);
  const shared = {contexts: ['all'] as ['all'], documentUrlPatterns: CHAT_DOCUMENT_PATTERNS};
  return [
    {id: QUICK_SAVE_MENU_ID, title: '快速收藏（未分類）', ...shared},
    {id: SAVE_TO_CATEGORY_MENU_ID, title: '收藏到分類', ...shared},
    ...categories.map((category) => ({
      id: categoryMenuId(category.id),
      parentId: SAVE_TO_CATEGORY_MENU_ID,
      title: names.get(category.id) ?? category.name,
      ...shared,
    })),
  ];
}

interface ContextMenuWriter {
  removeAll(callback?: () => void): unknown;
  create(properties: chrome.contextMenus.CreateProperties, callback?: () => void): string | number;
}

function removeAll(writer: ContextMenuWriter): Promise<void> {
  return new Promise((resolve) => { writer.removeAll(resolve); });
}

function create(writer: ContextMenuWriter, properties: chrome.contextMenus.CreateProperties): Promise<void> {
  return new Promise((resolve) => { writer.create(properties, resolve); });
}

export async function rebuildBookmarkContextMenus(writer: ContextMenuWriter, categories: Category[]): Promise<void> {
  await removeAll(writer);
  for (const entry of buildBookmarkContextMenuEntries(categories)) await create(writer, entry);
}
