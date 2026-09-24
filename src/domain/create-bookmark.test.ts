import {describe, expect, it, vi} from 'vitest';
import {createBookmarkIfAbsent} from './create-bookmark';
import type {Bookmark} from './schema';

const existing: Bookmark = {
  schemaVersion: 1, spaceId: 'space', threadId: 'thread', messageId: 'old-message',
  url: 'https://chat.google.com/room/space/thread/old-message?cls=10', title: '我的標題',
  sourceRoomName: '聊天室', categoryId: 'uncategorized', note: '私人筆記', pinned: false,
  createdAt: '2026-09-22T00:00:00.000Z', updatedAt: '2026-09-22T00:00:00.000Z',
};

describe('create bookmark if absent', () => {
  it('stores the selected message anchor on first creation', async () => {
    const repository = {getByMessage: vi.fn().mockResolvedValue(undefined), create: vi.fn(async (value) => value)};
    const result = await createBookmarkIfAbsent(repository, {spaceId: 'space', threadId: 'thread', messageId: 'reply', title: '標題', sourceRoomName: '聊天室'}, () => new Date('2026-09-22T01:00:00Z'));
    expect(result.status).toBe('created');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({messageId: 'reply'}));
  });

  it('performs no write and preserves every field for the same message', async () => {
    const repository = {getByMessage: vi.fn().mockResolvedValue(existing), create: vi.fn()};
    const result = await createBookmarkIfAbsent(repository, {spaceId: 'space', threadId: 'thread', messageId: 'old-message', title: '新標題', sourceRoomName: '新聊天室'});
    expect(result).toEqual({status: 'duplicate', bookmark: existing});
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('allows another message in the same thread', async () => {
    const repository = {getByMessage: vi.fn().mockResolvedValue(undefined), create: vi.fn(async (value) => value)};
    const result = await createBookmarkIfAbsent(repository, {spaceId: 'space', threadId: 'thread', messageId: 'new-message', title: '另一則', sourceRoomName: '聊天室'});
    expect(result.status).toBe('created');
  });
});
