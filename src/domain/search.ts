import {bookmarkStorageKey} from './identity';
import type {Bookmark, Category, LibraryData} from './schema';

function normalized(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().trim();
}

export function searchBookmarks(library: LibraryData, query: string): Bookmark[] {
  const needle = normalized(query);
  if (!needle) return [];
  const categoryNames = new Map<string, string>(library.categories.map((category: Category) => [category.id, normalized(category.name)]));
  return library.bookmarks
    .flatMap((bookmark) => {
      const title = normalized(bookmark.title);
      const category = categoryNames.get(bookmark.categoryId) ?? '';
      const note = normalized(bookmark.note);
      const rank = title.includes(needle) ? 0 : category.includes(needle) ? 1 : note.includes(needle) ? 2 : -1;
      return rank < 0 ? [] : [{bookmark, rank}];
    })
    .sort((left, right) => left.rank - right.rank
      || (right.bookmark.lastOpenedAt ?? '').localeCompare(left.bookmark.lastOpenedAt ?? '')
      || right.bookmark.createdAt.localeCompare(left.bookmark.createdAt)
      || bookmarkStorageKey(left.bookmark).localeCompare(bookmarkStorageKey(right.bookmark)))
    .map(({bookmark}) => bookmark);
}
