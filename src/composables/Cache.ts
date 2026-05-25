export type EntryLoader<R> = (...args: any) => Promise<R>;

export type EntryOptions<R> = {
    cacheKey: string,
    loader: EntryLoader<R>,
    expiration?: number,
};

export type CacheEntry<R = any> = {
    promise: Promise<R>,
    result?: R,
    error?: unknown,
    dispose: () => void,
    timeout?: ReturnType<typeof setTimeout>,
};

/**
 * @internal
 */
export class Cache {
    private readonly entries: Record<string, CacheEntry> = {};

    private readonly defaultExpiration: number;

    public constructor(defaultExpiration: number) {
        this.defaultExpiration = defaultExpiration;
    }

    public fetch<R>(options: EntryOptions<R>): CacheEntry<R> {
        const {cacheKey, loader, expiration = this.defaultExpiration} = options;

        const existing = this.get<R>(cacheKey);

        if (existing !== undefined) {
            return existing;
        }

        const entry: CacheEntry<R> = {
            dispose: () => {
                if (entry.timeout !== undefined || expiration < 0) {
                    return;
                }

                entry.timeout = setTimeout(
                    (): void => {
                        delete this.entries[cacheKey];
                    },
                    expiration,
                );
            },
            promise: loader()
                .then((result): R => {
                    entry.result = result;

                    return result;
                })
                .catch(error => {
                    entry.error = error;

                    throw error;
                })
                .finally(() => {
                    entry.dispose();
                }),
        };

        this.entries[cacheKey] = entry;

        return entry;
    }

    public get<R>(cacheKey: string): CacheEntry<R> | undefined {
        const entry = this.entries[cacheKey];

        if (entry === undefined) {
            return undefined;
        }

        if (entry.timeout !== undefined) {
            clearTimeout(entry.timeout);

            delete entry.timeout;

            entry.dispose();
        }

        return entry;
    }
}
