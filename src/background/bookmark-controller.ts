import {createBookmarkIfAbsent} from '../domain/create-bookmark';
import {createDefaultTitle} from '../domain/title';
import type {BookmarkRepository} from '../storage/repository';
import type {UndoManager} from '../storage/undo';
import type {ChatCaptureCandidate} from '../content/google-chat-parser';
import type {ToastMessage} from '../content/toast';

interface ContextResponse {ok: boolean; candidate?: ChatCaptureCandidate; errorCode?: string}
interface MenuInfo {frameId?: number}
interface SourceTab {id?: number; url?: string}
export interface BookmarkControllerDependencies {
  repository: BookmarkRepository;
  undo: UndoManager;
  sendMessage(tabId: number, message: unknown, options: {frameId: number}): Promise<ContextResponse>;
  notify(tabId: number, frameId: number, message: ToastMessage): Promise<unknown> | unknown;
}

export async function handleBookmarkContextMenu(deps: BookmarkControllerDependencies, info: MenuInfo, tab: SourceTab): Promise<void> {
  if (tab.id === undefined || info.frameId === undefined) return;
  try {
    const response = await deps.sendMessage(tab.id, {type: 'bookmark.read-context'}, {frameId: info.frameId});
    if (!response?.ok || !response.candidate) {
      await deps.notify(tab.id, info.frameId, {kind: 'error', errorCode: response?.errorCode || 'invalid-frame-response'});
      return;
    }
    const candidate = response.candidate;
    const result = await createBookmarkIfAbsent(deps.repository, {
      ...candidate.identity,
      title: createDefaultTitle({messageText: candidate.selectedMessageText, date: new Date()}),
      sourceRoomName: 'Google Chat',
    });
    if (result.status === 'duplicate') {
      await deps.notify(tab.id, info.frameId, {kind: 'duplicate', bookmark: {spaceId: result.bookmark.spaceId, threadId: result.bookmark.threadId, messageId: result.bookmark.messageId}});
      return;
    }
    const token = await deps.undo.recordCreation(result.bookmark);
    await deps.notify(tab.id, info.frameId, {kind: 'created', token});
  } catch (error) {
    const errorCode = error instanceof Error && error.message === 'repository-read-only' ? 'repository-read-only' : 'bookmark-failed';
    await deps.notify(tab.id, info.frameId, {kind: 'error', errorCode});
  }
}
