import type {Bookmark} from '../domain/schema';
import {BookmarkRepository} from './repository';
import type {StorageAdapter} from './storage-adapter';

const UNDO_KEY = 'operation:undo';

interface UndoRecord { token: string; bookmark: Bookmark }

export class UndoManager {
  constructor(private readonly session: StorageAdapter, private readonly repository: BookmarkRepository) {}

  async recordCreation(bookmark: Bookmark): Promise<string> {
    const token = crypto.randomUUID();
    await this.session.set({[UNDO_KEY]: {token, bookmark} satisfies UndoRecord});
    return token;
  }

  async invalidate(): Promise<void> {
    await this.session.remove(UNDO_KEY);
  }

  async undo(token: string): Promise<boolean> {
    const record = (await this.session.get(UNDO_KEY))[UNDO_KEY] as UndoRecord | undefined;
    if (!record || record.token !== token) return false;
    const removed = await this.repository.deleteIfMatches(record.bookmark);
    await this.invalidate();
    return removed;
  }
}
