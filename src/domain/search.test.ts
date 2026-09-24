import {describe, expect, it} from 'vitest';
import {searchBookmarks} from './search';
import {UNCATEGORIZED_CATEGORY, type Bookmark, type LibraryData} from './schema';
import {sampleBookmark} from '../storage/repository.test';

function item(threadId: string, fields: Partial<Bookmark>): Bookmark {
  return {...sampleBookmark(threadId), threadId, messageId: threadId, url: `https://chat.google.com/room/space/${threadId}/${threadId}?cls=10`, ...fields};
}

const library = (bookmarks: Bookmark[]): LibraryData => ({
  metadata: {schemaVersion: 3, revision: 0, categoryOrder: ['uncategorized', 'project'], pinnedOrder: []},
  categories: [UNCATEGORIZED_CATEGORY, {id: 'project', name: 'OpenSpec 專案', createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z'}],
  bookmarks,
  orders: {uncategorized: [], project: []},
});

describe('bookmark search', () => {
  it('ranks title before category before a collapsed note and ignores the legacy room field', () => {
    const values = [
      item('note', {title: '其他', note: 'release 線索'}),
      item('room', {title: '其他', sourceRoomName: 'Release room'}),
      item('category', {title: '其他', categoryId: 'project'}),
      item('title', {title: 'Release 規範'}),
    ];
    expect(searchBookmarks(library(values), 'release').map(({threadId}) => threadId)).toEqual(['title', 'note']);
    expect(searchBookmarks(library(values), 'openspec').map(({threadId}) => threadId)).toEqual(['category']);
  });

  it('uses last opened, creation time, then stable identity within one rank', () => {
    const values = [
      item('older-open', {title: 'match', lastOpenedAt: '2026-09-21T00:00:00.000Z'}),
      item('newer-open', {title: 'match', lastOpenedAt: '2026-09-22T00:00:00.000Z'}),
      item('never-new', {title: 'match', createdAt: '2026-09-23T00:00:00.000Z'}),
    ];
    expect(searchBookmarks(library(values), 'MATCH').map(({threadId}) => threadId)).toEqual(['newer-open', 'older-open', 'never-new']);
  });

  it('returns no result for blank or unmatched text', () => {
    expect(searchBookmarks(library([]), ' ')).toEqual([]);
    expect(searchBookmarks(library([item('one', {title: '標題'})]), '不存在')).toEqual([]);
  });
});
