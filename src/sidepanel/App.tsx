import {useDeferredValue, useEffect, useMemo, useRef, useState} from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {bookmarkStorageKey, type MessageIdentity} from '../domain/identity';
import {searchBookmarks} from '../domain/search';
import {graphemeLength, truncateGraphemes} from '../domain/title';
import {CURRENT_STORAGE_SCHEMA_VERSION, UNCATEGORIZED_ID, type Bookmark, type Category, type LibraryData, type LibraryView} from '../domain/schema';
import type {DeletionSnapshot} from '../storage/repository';
import {messages} from '../shared/messages';

export interface PanelRepository {
  initialize(): Promise<void>;
  view(): Promise<LibraryView>;
  snapshot(): Promise<LibraryData>;
  subscribe(listener: () => void): () => void;
  updateBookmark(identity: MessageIdentity, changes: {title: string; note: string}, expectedRevision?: number): Promise<Bookmark>;
  markOpened(identity: MessageIdentity, openedAt?: Date, expectedRevision?: number): Promise<void>;
  createCategory(name: string, options?: {expectedRevision?: number}): Promise<Category>;
  renameCategory(categoryId: string, name: string, expectedRevision?: number): Promise<Category>;
  setCategoryExpanded(categoryId: string, expanded: boolean): Promise<void>;
  reorderCategories(categoryIds: string[], expectedRevision?: number): Promise<void>;
  moveBookmark(identity: MessageIdentity, categoryId: string, targetIndex?: number, expectedRevision?: number): Promise<void>;
  setPinned(identity: MessageIdentity, pinned: boolean, expectedRevision?: number): Promise<void>;
  reorderPinned(keys: string[], expectedRevision?: number): Promise<void>;
  deleteBookmark(identity: MessageIdentity, expectedRevision?: number): Promise<DeletionSnapshot>;
  deleteCategory(categoryId: string, expectedRevision?: number): Promise<DeletionSnapshot>;
  restoreDeletion(snapshot: DeletionSnapshot, expectedRevision?: number): Promise<void>;
}

export interface DiagnosticActions {
  backup(library: LibraryData): void;
  preflight(json: string): Promise<LibraryData>;
  restore(candidate: LibraryData): Promise<void>;
}

export type SortData = {kind: 'category'; categoryId: string} | {kind: 'bookmark'; categoryId: string; key: string} | {kind: 'pinned'; key: string};
export type OrganizationDrop =
  | {kind: 'categories'; categoryIds: string[]}
  | {kind: 'pinned'; keys: string[]}
  | {kind: 'bookmark'; key: string; targetCategoryId: string; targetIndex: number};

export interface BookmarkDragPreview {
  key: string;
  targetCategoryId: string;
  targetIndex: number;
}

export function projectBookmarkOrders(view: LibraryView, preview: BookmarkDragPreview | null): Record<string, string[]> {
  if (!preview) return view.orders;
  const bookmark = view.bookmarks.find((item) => recordKey(item) === preview.key);
  if (!bookmark || !view.orders[preview.targetCategoryId]) return view.orders;
  const source = (view.orders[bookmark.categoryId] ?? []).filter((key) => key !== preview.key);
  const targetBase = bookmark.categoryId === preview.targetCategoryId
    ? source
    : view.orders[preview.targetCategoryId].filter((key) => key !== preview.key);
  const targetIndex = Math.max(0, Math.min(preview.targetIndex, targetBase.length));
  const target = [...targetBase.slice(0, targetIndex), preview.key, ...targetBase.slice(targetIndex)];
  return bookmark.categoryId === preview.targetCategoryId
    ? {...view.orders, [preview.targetCategoryId]: target}
    : {...view.orders, [bookmark.categoryId]: source, [preview.targetCategoryId]: target};
}

export function resolveOrganizationDrop(view: LibraryView, active: SortData, over: SortData): OrganizationDrop | null {
  if (active.kind === 'category' && over.kind === 'category') {
    const oldIndex = view.metadata.categoryOrder.indexOf(active.categoryId);
    const newIndex = view.metadata.categoryOrder.indexOf(over.categoryId);
    return oldIndex < 0 || newIndex < 0 || oldIndex === newIndex ? null : {kind: 'categories', categoryIds: arrayMove(view.metadata.categoryOrder, oldIndex, newIndex)};
  }
  if (active.kind === 'pinned' && over.kind === 'pinned') {
    const oldIndex = view.metadata.pinnedOrder.indexOf(active.key);
    const newIndex = view.metadata.pinnedOrder.indexOf(over.key);
    return oldIndex < 0 || newIndex < 0 || oldIndex === newIndex ? null : {kind: 'pinned', keys: arrayMove(view.metadata.pinnedOrder, oldIndex, newIndex)};
  }
  if (active.kind === 'bookmark' && (over.kind === 'bookmark' || over.kind === 'category')) {
    const targetCategoryId = over.categoryId;
    const targetIndex = over.kind === 'category' ? 0 : Math.max(0, (view.orders[targetCategoryId] ?? []).indexOf(over.key));
    return {kind: 'bookmark', key: active.key, targetCategoryId, targetIndex};
  }
  return null;
}

const organizationCollisionDetection: CollisionDetection = (args) => {
  const active = args.active.data.current as SortData | undefined;
  const allowed = active?.kind === 'category' ? new Set(['category']) : active?.kind === 'pinned' ? new Set(['pinned']) : new Set(['bookmark', 'category']);
  const filtered = {...args, droppableContainers: args.droppableContainers.filter((container) => allowed.has((container.data.current as SortData | undefined)?.kind ?? ''))};
  if (active?.kind === 'bookmark') {
    const pointerHits = pointerWithin(filtered);
    const bookmarkHit = pointerHits.find(({id}) => (args.droppableContainers.find((container) => container.id === id)?.data.current as SortData | undefined)?.kind === 'bookmark');
    if (bookmarkHit) return [bookmarkHit];
    if (pointerHits.length) return [pointerHits[0]];
  }
  return closestCenter(filtered);
};

const restrictToVerticalAxis: Modifier = ({transform}) => ({...transform, x: 0});
const dragModifiers = [restrictToVerticalAxis];

const emptyView: LibraryView = {
  metadata: {schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION, revision: 0, categoryOrder: [], pinnedOrder: []},
  categories: [], bookmarks: [], orders: {}, expandedCategoryIds: [],
};

function recordKey(bookmark: Bookmark): string {
  return bookmarkStorageKey(bookmark);
}

function categorySortableId(categoryId: string): string {
  return `category-row:${categoryId}`;
}

function bookmarkSortableId(key: string): string {
  return `bookmark-row:${key}`;
}

function pinnedSortableId(key: string): string {
  return `pinned-row:${key}`;
}

function IconButton({label, children, className = '', ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {label: string}) {
  return <button {...props} type="button" className={`icon-button ${className}`} aria-label={label} title={label}>{children}</button>;
}

function BookmarkEditor({bookmark, onSave, onCancel}: {bookmark: Bookmark; onSave: (title: string, note: string) => Promise<void>; onCancel: () => void}) {
  const [title, setTitle] = useState(bookmark.title);
  const [note, setNote] = useState(bookmark.note);
  const [error, setError] = useState('');
  const titleLength = graphemeLength(title);
  const noteLength = graphemeLength(note);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) { setError(messages.titleRequired); return; }
    setError('');
    await onSave(title.trim(), note);
  };
  return <form className="inline-editor" onSubmit={(event) => void submit(event)}>
    <label>{messages.title}<input autoFocus value={title} onChange={(event) => setTitle(truncateGraphemes(event.target.value, 30))} aria-invalid={Boolean(error)} /></label>
    {titleLength >= 24 && <span className="character-count">{titleLength}/30</span>}
    <label>{messages.note}<textarea value={note} onChange={(event) => setNote(truncateGraphemes(event.target.value, 500))} rows={4} /></label>
    {noteLength >= 450 && <span className="character-count">{noteLength}/500</span>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="editor-actions"><button type="submit">{messages.save}</button><button type="button" onClick={onCancel}>{messages.cancel}</button></div>
  </form>;
}

interface BookmarkRowProps {
  bookmark: Bookmark;
  onNavigate: (bookmark: Bookmark) => Promise<void>;
  onEdit: (bookmark: Bookmark, title: string, note: string) => Promise<void>;
  onDelete: (bookmark: Bookmark) => Promise<void>;
  onPin: (bookmark: Bookmark) => Promise<void>;
  dragHandle?: React.ReactNode;
}

function BookmarkRow({bookmark, onNavigate, onEdit, onDelete, onPin, dragHandle}: BookmarkRowProps) {
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  if (editing) return <div className="bookmark-row editing"><BookmarkEditor bookmark={bookmark} onSave={async (title, note) => { await onEdit(bookmark, title, note); setEditing(false); }} onCancel={() => setEditing(false)} /></div>;
  return <div className="bookmark-row" onMouseLeave={() => setMenuOpen(false)}>
    <div className="bookmark-main">
      <IconButton label={details ? messages.collapseDetails : messages.expandDetails} className="detail-toggle" onClick={() => setDetails((value) => !value)}>{details ? '▾' : '▸'}</IconButton>
      <button className="bookmark-link" type="button" title={bookmark.title} aria-label={`${messages.open}: ${bookmark.title}`} onClick={() => void onNavigate(bookmark)}>{bookmark.title}</button>
      <div className="row-actions">
        <IconButton label={bookmark.pinned ? messages.unpin : messages.pin} className={bookmark.pinned ? 'is-active' : ''} onClick={() => void onPin(bookmark)}>★</IconButton>
        {dragHandle}
        <div className={`more-menu${menuOpen ? ' open' : ''}`}>
          <IconButton label={messages.more} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>⋯</IconButton>
          {menuOpen && <div className="menu-popover">
            <button type="button" onClick={() => { setMenuOpen(false); setEditing(true); }}>{messages.edit}</button>
            <button className="danger-action" type="button" onClick={() => { setMenuOpen(false); void onDelete(bookmark); }}>{messages.delete}</button>
          </div>}
        </div>
      </div>
    </div>
    {details && <div className="bookmark-details">
      {bookmark.note && <p className="note-text">{bookmark.note}</p>}
      <div className="bookmark-time" aria-label={`${messages.savedAt}：${new Date(bookmark.createdAt).toLocaleString()}`}>
        <svg className="time-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 7v5l3 2M12 3a9 9 0 1 1-7.8 4.5M4.2 3.8v3.7h3.7"/></svg>
        <time dateTime={bookmark.createdAt}>{new Date(bookmark.createdAt).toLocaleString()}</time>
      </div>
    </div>}
  </div>;
}

function SortableBookmarkRow(props: BookmarkRowProps & {sortableId: string; data: SortData; previewed?: boolean}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: props.sortableId, data: props.data});
  const handle = <IconButton label={messages.dragBookmark} className="drag-handle" {...attributes} {...listeners}>⠿</IconButton>;
  const className = `sortable${isDragging ? ' dragging' : ''}${props.previewed ? ' drop-preview' : ''}`;
  return <li ref={setNodeRef} className={className} style={{transform: CSS.Transform.toString(transform), transition}}><BookmarkRow {...props} dragHandle={handle} /></li>;
}

interface CategorySectionProps {
  category: Category;
  bookmarks: Bookmark[];
  expanded: boolean;
  handlers: Omit<BookmarkRowProps, 'bookmark' | 'categories' | 'dragHandle'>;
  onToggle: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
  dragTarget: boolean;
  previewKey?: string;
}

function CategorySection({category, bookmarks, expanded, handlers, onToggle, onRename, onDelete, dragTarget, previewKey}: CategorySectionProps) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: categorySortableId(category.id), data: {kind: 'category', categoryId: category.id} satisfies SortData});
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await onRename(name.trim());
    setRenaming(false);
  };
  return <section ref={setNodeRef} className={`category-section${isDragging ? ' dragging' : ''}${dragTarget ? ' drag-target' : ''}`} style={{transform: CSS.Transform.toString(transform), transition}} onMouseLeave={() => setMenuOpen(false)}>
    {renaming ? <form className="category-editor" onSubmit={(event) => void saveName(event)}><input autoFocus value={name} onChange={(event) => setName(truncateGraphemes(event.target.value, 30))} aria-label={messages.categoryName}/><button type="submit">{messages.save}</button><button type="button" onClick={() => { setName(category.name); setRenaming(false); }}>{messages.cancel}</button></form> : <div className="category-header">
      <button className="category-toggle" type="button" onClick={onToggle} aria-expanded={expanded} title={category.name}><span aria-hidden>{expanded ? '▾' : '▸'}</span><span className="ellipsis">{category.name}</span><span className="count">{bookmarks.length}</span></button>
      <div className="row-actions">
        <IconButton label={messages.dragCategory} className="drag-handle" {...attributes} {...listeners}>⠿</IconButton>
        {category.id !== UNCATEGORIZED_ID && <div className={`more-menu${menuOpen ? ' open' : ''}`}><IconButton label={messages.more} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>⋯</IconButton>{menuOpen && <div className="menu-popover"><button type="button" onClick={() => { setMenuOpen(false); setRenaming(true); }}>{messages.rename}</button><button className="danger-action" type="button" onClick={() => { setMenuOpen(false); onDelete(); }}>{messages.deleteCategory}</button></div>}</div>}
      </div>
    </div>}
    {expanded && <SortableContext items={bookmarks.map((bookmark) => bookmarkSortableId(recordKey(bookmark)))} strategy={verticalListSortingStrategy}><ul className="bookmark-list">{bookmarks.map((bookmark) => <SortableBookmarkRow key={recordKey(bookmark)} sortableId={bookmarkSortableId(recordKey(bookmark))} data={{kind: 'bookmark', categoryId: category.id, key: recordKey(bookmark)}} bookmark={bookmark} previewed={dragTarget && previewKey === recordKey(bookmark)} {...handlers} />)}</ul></SortableContext>}
  </section>;
}

export function App({repository, diagnostics, onNavigate}: {repository?: PanelRepository; diagnostics?: DiagnosticActions; onNavigate?: (bookmark: Bookmark) => void | boolean | Promise<void | boolean>}) {
  const [view, setView] = useState<LibraryView>(emptyView);
  const [ready, setReady] = useState(!repository);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [undo, setUndo] = useState<DeletionSnapshot | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<BookmarkDragPreview | null>(null);
  const [dragExpandedCategoryIds, setDragExpandedCategoryIds] = useState<string[]>([]);
  const dragPreviewRef = useRef<BookmarkDragPreview | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}));

  const reload = async () => {
    if (!repository) return;
    try { setView(await repository.view()); setReady(true); }
    catch { setStatus(messages.readOnly); setReady(true); }
  };

  useEffect(() => {
    if (!repository) return;
    let active = true;
    const load = async () => {
      try { await repository.initialize(); const next = await repository.view(); if (active) { setView(next); setReady(true); } }
      catch { if (active) { setStatus(messages.readOnly); setReady(true); } }
    };
    void load();
    const unsubscribe = repository.subscribe(() => { if (active) void repository.view().then((next) => { if (active) setView(next); }); });
    return () => { active = false; unsubscribe(); };
  }, [repository]);

  const bookmarkByKey = useMemo(() => new Map(view.bookmarks.map((bookmark) => [recordKey(bookmark), bookmark])), [view.bookmarks]);
  const categoryById = useMemo(() => new Map(view.categories.map((category) => [category.id, category])), [view.categories]);
  const displayedOrders = useMemo(() => projectBookmarkOrders(view, dragPreview), [view, dragPreview]);
  const categoryBookmarks = (categoryId: string) => (displayedOrders[categoryId] ?? []).map((key) => bookmarkByKey.get(key)).filter((value): value is Bookmark => Boolean(value));
  const searchResults = useMemo(() => searchBookmarks(view, deferredQuery), [view, deferredQuery]);

  const runMutation = async (action: (revision: number) => Promise<unknown>) => {
    if (!repository) return;
    setUndo(null);
    try { await action(view.metadata.revision); await reload(); setStatus(''); }
    catch (error) { await reload(); setStatus(error instanceof Error && error.message === 'revision-conflict' ? messages.dataChanged : messages.operationFailed); }
  };

  const navigate = async (bookmark: Bookmark) => {
    try {
      const result = await onNavigate?.(bookmark);
      if (result === false) throw new Error('navigation-failed');
      if (repository && onNavigate) { setUndo(null); await repository.markOpened(bookmark); await reload(); }
    } catch { setStatus(messages.navigationFailed); }
  };

  const editBookmark = async (bookmark: Bookmark, title: string, note: string) => runMutation((revision) => repository!.updateBookmark(bookmark, {title, note}, revision));
  const pinBookmark = async (bookmark: Bookmark) => runMutation((revision) => repository!.setPinned(bookmark, !bookmark.pinned, revision));
  const deleteBookmark = async (bookmark: Bookmark) => {
    if (!repository) return;
    setUndo(null);
    try { const snapshot = await repository.deleteBookmark(bookmark, view.metadata.revision); setUndo(snapshot); await reload(); }
    catch { await reload(); setStatus(messages.operationFailed); }
  };

  const restoreLastDeletion = async () => {
    if (!repository || !undo) return;
    try { await repository.restoreDeletion(undo, view.metadata.revision); setUndo(null); await reload(); }
    catch { setUndo(null); await reload(); setStatus(messages.undoFailed); }
  };

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCategoryName.trim()) return;
    await runMutation((revision) => repository!.createCategory(newCategoryName.trim(), {expectedRevision: revision}));
    setNewCategoryName(''); setShowCreate(false);
  };

  const confirmDeleteCategory = async () => {
    if (!repository || !deleteCategoryId) return;
    setUndo(null);
    try { const snapshot = await repository.deleteCategory(deleteCategoryId, view.metadata.revision); setUndo(snapshot); setDeleteCategoryId(null); await reload(); }
    catch { setDeleteCategoryId(null); await reload(); setStatus(messages.operationFailed); }
  };

  const clearDragPreview = () => {
    dragPreviewRef.current = null;
    setDragPreview(null);
    setDragExpandedCategoryIds([]);
  };

  const onDragOver = (event: DragOverEvent) => {
    const active = event.active.data.current as SortData | undefined;
    const over = event.over?.data.current as SortData | undefined;
    if (active?.kind !== 'bookmark' || !over || (over.kind !== 'bookmark' && over.kind !== 'category')) return;
    const targetCategoryId = over.categoryId;
    const currentOrders = projectBookmarkOrders(view, dragPreviewRef.current);
    const targetOrder = (currentOrders[targetCategoryId] ?? []).filter((key) => key !== active.key);
    let targetIndex = over.kind === 'category' ? 0 : Math.max(0, targetOrder.indexOf(over.key));
    if (over.kind === 'bookmark') {
      const activeRect = event.active.rect.current.translated;
      const overRect = event.over?.rect;
      if (activeRect && overRect && activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2) targetIndex += 1;
    }
    const nextPreview = {key: active.key, targetCategoryId, targetIndex};
    dragPreviewRef.current = nextPreview;
    setDragPreview((current) => current?.key === active.key && current.targetCategoryId === targetCategoryId && current.targetIndex === targetIndex ? current : nextPreview);
    if (!view.expandedCategoryIds.includes(targetCategoryId)) {
      setDragExpandedCategoryIds((current) => current.includes(targetCategoryId) ? current : [...current, targetCategoryId]);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const active = event.active.data.current as SortData | undefined;
    const over = event.over?.data.current as SortData | undefined;
    const latestPreview = dragPreviewRef.current;
    const bookmarkDrop = active?.kind === 'bookmark' && latestPreview
      ? {kind: 'bookmark' as const, key: active.key, targetCategoryId: latestPreview.targetCategoryId, targetIndex: latestPreview.targetIndex}
      : null;
    if (!active || !over || !repository) { clearDragPreview(); return; }
    const drop = bookmarkDrop ?? (event.active.id === event.over?.id ? null : resolveOrganizationDrop(view, active, over));
    if (!drop) { clearDragPreview(); return; }
    if (drop.kind === 'categories') { clearDragPreview(); void runMutation((revision) => repository.reorderCategories(drop.categoryIds, revision)); }
    if (drop.kind === 'pinned') { clearDragPreview(); void runMutation((revision) => repository.reorderPinned(drop.keys, revision)); }
    if (drop.kind === 'bookmark') {
      const bookmark = bookmarkByKey.get(drop.key);
      if (!bookmark) { clearDragPreview(); return; }
      const projectedOrders = projectBookmarkOrders(view, drop);
      if (bookmark.categoryId === drop.targetCategoryId
        && projectedOrders[bookmark.categoryId]?.every((key, index) => key === view.orders[bookmark.categoryId]?.[index])) { clearDragPreview(); return; }
      void runMutation(async (revision) => {
        await repository.moveBookmark(bookmark, drop.targetCategoryId, drop.targetIndex, revision);
        if (!view.expandedCategoryIds.includes(drop.targetCategoryId)) await repository.setCategoryExpanded(drop.targetCategoryId, true);
      }).finally(clearDragPreview);
    }
  };

  const restoreFile = async (file?: File) => {
    if (!file || !diagnostics) return;
    try {
      const candidate = await diagnostics.preflight(await file.text());
      if (!window.confirm(`還原會完整取代目前本機收藏庫（${candidate.bookmarks.length} 筆 Bookmark）。要繼續嗎？`)) return;
      setUndo(null); await diagnostics.restore(candidate); await reload(); setStatus(messages.restoreComplete);
    } catch { setStatus(messages.restoreFailed); }
    finally { if (inputRef.current) inputRef.current.value = ''; }
  };

  const rowHandlers = {onNavigate: navigate, onEdit: editBookmark, onDelete: deleteBookmark, onPin: pinBookmark};
  const selectedDeleteCategory = deleteCategoryId ? categoryById.get(deleteCategoryId) : undefined;
  const selectedDeleteCount = deleteCategoryId ? categoryBookmarks(deleteCategoryId).length : 0;

  return <main className="app-shell">
    <div className="toolbar">
      <div className="toolbar-row">
        <label className="search-field"><span className="sr-only">{messages.search}</span><input type="search" placeholder={messages.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <IconButton label={messages.addCategory} aria-expanded={showCreate} onClick={() => setShowCreate((value) => !value)}>＋</IconButton>
      </div>
      {showCreate && <form className="create-category" onSubmit={(event) => void createCategory(event)}><input autoFocus aria-label={messages.categoryName} placeholder={messages.categoryName} value={newCategoryName} onChange={(event) => setNewCategoryName(truncateGraphemes(event.target.value, 30))}/><button type="submit">{messages.add}</button><button type="button" onClick={() => setShowCreate(false)}>{messages.cancel}</button></form>}
    </div>
    <div className="list-region" aria-busy={!ready}>
      {!ready ? <p>{messages.loading}</p> : view.bookmarks.length === 0 ? <div className="empty-state"><strong>{messages.emptyTitle}</strong><p>{messages.emptyDescription}</p></div> : deferredQuery.trim() ? <section aria-labelledby="search-results-title"><h2 id="search-results-title">{messages.searchResults} <span className="count">{searchResults.length}</span></h2>{searchResults.length === 0 ? <p className="no-results">{messages.noResults}</p> : <ul className="bookmark-list search-results">{searchResults.map((bookmark) => <li key={recordKey(bookmark)}><BookmarkRow bookmark={bookmark} {...rowHandlers}/></li>)}</ul>}</section> : <DndContext sensors={sensors} modifiers={dragModifiers} collisionDetection={organizationCollisionDetection} onDragOver={onDragOver} onDragCancel={clearDragPreview} onDragEnd={onDragEnd}>
        {view.metadata.pinnedOrder.length > 0 && <section className="pinned-section" aria-labelledby="pinned-title"><h2 id="pinned-title">★ {messages.pinned}</h2><SortableContext items={view.metadata.pinnedOrder.map(pinnedSortableId)} strategy={verticalListSortingStrategy}><ul className="bookmark-list">{view.metadata.pinnedOrder.map((key) => bookmarkByKey.get(key)).filter((value): value is Bookmark => Boolean(value)).map((bookmark) => <SortableBookmarkRow key={recordKey(bookmark)} sortableId={pinnedSortableId(recordKey(bookmark))} data={{kind: 'pinned', key: recordKey(bookmark)}} bookmark={bookmark} {...rowHandlers}/>)}</ul></SortableContext></section>}
        <SortableContext items={view.metadata.categoryOrder.map(categorySortableId)} strategy={verticalListSortingStrategy}><div className="category-list">{view.categories.map((category) => <CategorySection key={category.id} category={category} bookmarks={categoryBookmarks(category.id)} expanded={view.expandedCategoryIds.includes(category.id) || dragExpandedCategoryIds.includes(category.id)} dragTarget={dragPreview?.targetCategoryId === category.id} previewKey={dragPreview?.key} handlers={rowHandlers} onToggle={() => void repository?.setCategoryExpanded(category.id, !view.expandedCategoryIds.includes(category.id)).then(reload)} onRename={(name) => runMutation((revision) => repository!.renameCategory(category.id, name, revision)).then(() => undefined)} onDelete={() => setDeleteCategoryId(category.id)}/>)}</div></SortableContext>
      </DndContext>}
    </div>
    {undo && <div className="undo-snackbar" role="status"><span>{undo.type === 'category' ? messages.categoryDeleted : messages.bookmarkDeleted}</span><button type="button" onClick={() => void restoreLastDeletion()}>{messages.undo}</button></div>}
    {status && <p className="global-status" role="status">{status}</p>}
    {selectedDeleteCategory && <div className="dialog-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" className="confirm-dialog"><h2 id="delete-dialog-title">{messages.deleteCategory}</h2><p>{`這個分類包含 ${selectedDeleteCount} 筆 Bookmark`}</p><p className="muted">{messages.deleteCategoryDescription}</p><div><button type="button" onClick={() => setDeleteCategoryId(null)}>{messages.cancel}</button><button className="danger-button" type="button" onClick={() => void confirmDeleteCategory()}>{messages.confirmDelete}</button></div></div></div>}
    {repository && diagnostics && <details className="diagnostics"><summary>{messages.diagnostics}</summary><div className="diagnostic-actions"><button type="button" onClick={() => void repository.snapshot().then(diagnostics.backup)}>完整備份</button><button type="button" onClick={() => inputRef.current?.click()}>完整還原</button><input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void restoreFile(event.target.files?.[0])}/></div></details>}
  </main>;
}
