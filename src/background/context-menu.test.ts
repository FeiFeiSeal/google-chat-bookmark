import {describe, expect, it, vi} from 'vitest';
import {UNCATEGORIZED_CATEGORY, type Category} from '../domain/schema';
import {
  QUICK_SAVE_MENU_ID,
  SAVE_TO_CATEGORY_MENU_ID,
  buildBookmarkContextMenuEntries,
  categoryIdFromMenuId,
  categoryMenuId,
  rebuildBookmarkContextMenus,
} from './context-menu';

function category(id: string, name: string): Category {
  return {id, name, createdAt: '2026-09-29T00:00:00.000Z', updatedAt: '2026-09-29T00:00:00.000Z'};
}

describe('bookmark context menus', () => {
  it('keeps quick save and lists every category in library order', () => {
    const categories = [UNCATEGORIZED_CATEGORY, category('a', '專案'), category('b', '專案')];
    const entries = buildBookmarkContextMenuEntries(categories);
    expect(entries.slice(0, 2).map(({id}) => id)).toEqual([QUICK_SAVE_MENU_ID, SAVE_TO_CATEGORY_MENU_ID]);
    expect(entries.slice(2).map(({id, title, parentId}) => ({id, title, parentId}))).toEqual([
      {id: categoryMenuId('uncategorized'), title: '未分類', parentId: SAVE_TO_CATEGORY_MENU_ID},
      {id: categoryMenuId('a'), title: '專案（第 1 個）', parentId: SAVE_TO_CATEGORY_MENU_ID},
      {id: categoryMenuId('b'), title: '專案（第 2 個）', parentId: SAVE_TO_CATEGORY_MENU_ID},
    ]);
  });

  it('round-trips safe category menu IDs and rejects other items', () => {
    expect(categoryIdFromMenuId(categoryMenuId('分類 / A'))).toBe('分類 / A');
    expect(categoryIdFromMenuId(QUICK_SAVE_MENU_ID)).toBeNull();
    expect(categoryIdFromMenuId(3)).toBeNull();
  });

  it('removes stale entries before rebuilding parents and children in order', async () => {
    const calls: string[] = [];
    const writer = {
      removeAll: vi.fn((callback?: () => void) => { calls.push('remove'); callback?.(); }),
      create: vi.fn((entry: chrome.contextMenus.CreateProperties, callback?: () => void) => { calls.push(String(entry.id)); callback?.(); return String(entry.id); }),
    };
    await rebuildBookmarkContextMenus(writer, [UNCATEGORIZED_CATEGORY, category('project', '專案')]);
    expect(calls).toEqual(['remove', QUICK_SAVE_MENU_ID, SAVE_TO_CATEGORY_MENU_ID, categoryMenuId('uncategorized'), categoryMenuId('project')]);
  });
});
