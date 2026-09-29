import {describe, expect, it, vi} from 'vitest';
import {handleBookmarkContextMenu} from './bookmark-controller';
import {MemoryStorageAdapter} from '../storage/storage-adapter';
import {BookmarkRepository} from '../storage/repository';
import {UndoManager} from '../storage/undo';

const candidate = {identity: {spaceId: 'space', threadId: 'thread', messageId: 'reply'}, canonicalUrl: 'https://chat.google.com/room/space/thread/reply?cls=10', selectedMessageText: '被收藏的訊息', capturedAt: Date.now()};

describe('background bookmark flow', () => {
  it('targets the exact frame and creates once', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter()); await repository.initialize();
    await repository.createCategory('專案', {id: 'project'});
    const sendMessage = vi.fn().mockResolvedValue({ok: true, candidate});
    const notify = vi.fn();
    const deps = {repository, undo: new UndoManager(new MemoryStorageAdapter(), repository), sendMessage, notify};
    await handleBookmarkContextMenu(deps, {frameId: 31}, {id: 7, url: 'https://mail.google.com/mail/u/0/'}, 'project');
    expect(sendMessage).toHaveBeenCalledWith(7, {type: 'bookmark.read-context'}, {frameId: 31});
    expect(notify).toHaveBeenCalledWith(7, 31, expect.objectContaining({kind: 'created'}));
    expect((await repository.view()).bookmarks[0].title).toBe('被收藏的訊息');
    expect((await repository.view()).bookmarks[0].categoryId).toBe('project');
    await handleBookmarkContextMenu(deps, {frameId: 31}, {id: 7, url: 'https://mail.google.com/mail/u/0/'}, 'project');
    expect(notify).toHaveBeenLastCalledWith(7, 31, {kind: 'duplicate', bookmark: {spaceId: 'space', threadId: 'thread', messageId: 'reply'}});
  });

  it('reports invalid response and repository read-only errors without writing', async () => {
    const repository = new BookmarkRepository(new MemoryStorageAdapter()); await repository.initialize();
    const notify = vi.fn();
    await handleBookmarkContextMenu({repository, undo: new UndoManager(new MemoryStorageAdapter(), repository), sendMessage: vi.fn().mockResolvedValue({ok: false, errorCode: 'invalid-target'}), notify}, {frameId: 2}, {id: 1, url: 'https://mail.google.com/'});
    expect(notify).toHaveBeenCalledWith(1, 2, expect.objectContaining({kind: 'error', errorCode: 'invalid-target'}));
    repository.isReadOnly = true;
    await handleBookmarkContextMenu({repository, undo: new UndoManager(new MemoryStorageAdapter(), repository), sendMessage: vi.fn().mockResolvedValue({ok: true, candidate}), notify}, {frameId: 2}, {id: 1, url: 'https://mail.google.com/'});
    expect(notify).toHaveBeenLastCalledWith(1, 2, expect.objectContaining({kind: 'error', errorCode: 'repository-read-only'}));
  });
});
