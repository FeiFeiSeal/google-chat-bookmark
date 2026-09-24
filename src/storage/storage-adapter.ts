export type StorageRecord = Record<string, unknown>;
export type StorageListener = (changes: Record<string, {oldValue?: unknown; newValue?: unknown}>) => void;

export interface StorageAdapter {
  get(keys?: string | string[]): Promise<StorageRecord>;
  set(values: StorageRecord): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
  getBytesInUse(keys?: string | string[]): Promise<number>;
  subscribe(listener: StorageListener): () => void;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private data: StorageRecord;
  private listeners = new Set<StorageListener>();
  writeCount = 0;

  constructor(initial: StorageRecord = {}) {
    this.data = structuredClone(initial);
  }

  async get(keys?: string | string[]): Promise<StorageRecord> {
    if (keys === undefined) return structuredClone(this.data);
    const requested = typeof keys === 'string' ? [keys] : keys;
    return Object.fromEntries(requested.filter((key) => key in this.data).map((key) => [key, structuredClone(this.data[key])]));
  }

  async set(values: StorageRecord): Promise<void> {
    const changes: Parameters<StorageListener>[0] = {};
    for (const [key, newValue] of Object.entries(values)) {
      changes[key] = {oldValue: this.data[key], newValue: structuredClone(newValue)};
      this.data[key] = structuredClone(newValue);
    }
    this.writeCount += 1;
    this.listeners.forEach((listener) => listener(changes));
  }

  async remove(keys: string | string[]): Promise<void> {
    const requested = typeof keys === 'string' ? [keys] : keys;
    const changes: Parameters<StorageListener>[0] = {};
    for (const key of requested) {
      if (key in this.data) changes[key] = {oldValue: this.data[key]};
      delete this.data[key];
    }
    this.writeCount += 1;
    if (Object.keys(changes).length) this.listeners.forEach((listener) => listener(changes));
  }

  async clear(): Promise<void> {
    await this.remove(Object.keys(this.data));
  }

  async getBytesInUse(keys?: string | string[]): Promise<number> {
    return new TextEncoder().encode(JSON.stringify(await this.get(keys))).length;
  }

  subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export class ChromeStorageAdapter implements StorageAdapter {
  constructor(private readonly area: chrome.storage.StorageArea, private readonly areaName: 'local' | 'session') {}
  async get(keys?: string | string[]): Promise<StorageRecord> { return this.area.get(keys); }
  async set(values: StorageRecord): Promise<void> { await this.area.set(values); }
  async remove(keys: string | string[]): Promise<void> { await this.area.remove(keys); }
  async clear(): Promise<void> { await this.area.clear(); }
  async getBytesInUse(keys?: string | string[]): Promise<number> { return this.area.getBytesInUse(keys); }
  subscribe(listener: StorageListener): () => void {
    const wrapped = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === this.areaName) listener(changes);
    };
    chrome.storage.onChanged.addListener(wrapped);
    return () => chrome.storage.onChanged.removeListener(wrapped);
  }
}
