import {buildCanonicalChatUrl, type MessageIdentity} from './identity';
import {UNCATEGORIZED_ID, type Bookmark} from './schema';

export interface BookmarkWriter {
  getByMessage(identity: MessageIdentity): Promise<Bookmark | undefined>;
  create(bookmark: Bookmark): Promise<Bookmark>;
}

export interface CreateBookmarkInput extends MessageIdentity {
  title: string;
  sourceRoomName: string;
  categoryId?: string;
}

export type CreateBookmarkResult = {status: 'created'; bookmark: Bookmark} | {status: 'duplicate'; bookmark: Bookmark};

export async function createBookmarkIfAbsent(repository: BookmarkWriter, input: CreateBookmarkInput, now = () => new Date()): Promise<CreateBookmarkResult> {
  const existing = await repository.getByMessage(input);
  if (existing) return {status: 'duplicate', bookmark: existing};
  const timestamp = now().toISOString();
  const bookmark: Bookmark = {
    schemaVersion: 1,
    spaceId: input.spaceId,
    threadId: input.threadId,
    messageId: input.messageId,
    url: buildCanonicalChatUrl(input),
    title: input.title,
    sourceRoomName: input.sourceRoomName,
    categoryId: input.categoryId ?? UNCATEGORIZED_ID,
    note: '',
    pinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return {status: 'created', bookmark: await repository.create(bookmark)};
}
