interface ExtensionOptions {
  removeMix: boolean;
  hideShorts: boolean;
  hideHomeFeed: boolean;
  hideRecommended: boolean;
  disableComments: boolean;
  disableAutoplay: boolean;
}

interface ExtensionStorage {
  extensionEnabled: boolean;
  options: ExtensionOptions;
}

declare namespace chrome.storage {
  interface SyncStorageArea {
    // Promise overload
    get(keys: null): Promise<ExtensionStorage>;
    get<T extends keyof ExtensionStorage>(
      keys: T | T[]
    ): Promise<Pick<ExtensionStorage, T>>;

    // Callback overload
    get(callback: (items: ExtensionStorage) => void): void;
    get<T extends keyof ExtensionStorage>(
      keys: T | T[],
      callback: (items: Pick<ExtensionStorage, T>) => void
    ): void;

    set(items: Partial<ExtensionStorage>): Promise<void>;
    set(items: Partial<ExtensionStorage>, callback: () => void): void;
  }
}
