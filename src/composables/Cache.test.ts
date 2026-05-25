import type {EntryOptions} from './Cache';
import {Cache} from './Cache';

describe('Cache', () => {
    afterEach(() => {
        jest.clearAllTimers();
        jest.resetAllMocks();
    });

    it('should fetch and cache the value for the default cache time', async () => {
        jest.useFakeTimers();

        const cache = new Cache(10);

        const loader = jest.fn()
            .mockResolvedValueOnce('result1')
            .mockResolvedValueOnce('result2');

        const options: EntryOptions<string> = {
            cacheKey: 'key',
            loader: loader,
        };

        const entry = cache.fetch(options);

        await expect(entry.promise).resolves.toEqual('result1');

        expect(entry.result).toEqual('result1');

        const cachedEntry = cache.fetch(options);

        expect(cachedEntry).toBe(entry);
        expect(cachedEntry.result).toEqual('result1');

        expect(loader).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(10);

        const newEntry = cache.fetch(options);

        expect(newEntry).not.toBe(entry);

        await expect(newEntry.promise).resolves.toEqual('result2');

        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('should fetch the value once before expiration', async () => {
        jest.useFakeTimers();

        const cache = new Cache(10);

        const loader = jest.fn(
            () => new Promise<string>(resolve => {
                setTimeout(() => resolve('done'), 10);
            }),
        );

        const options: EntryOptions<string> = {
            cacheKey: 'key',
            loader: loader,
        };

        const entry1 = cache.fetch(options);
        const entry2 = cache.fetch(options);

        expect(entry1).toBe(entry2);
        expect(entry1.promise).toBe(entry2.promise);

        jest.advanceTimersByTime(10);

        await expect(entry1.promise).resolves.toEqual('done');

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should fetch and cache the value for the specified time', async () => {
        jest.useFakeTimers();

        const cache = new Cache(10);

        const loader = jest.fn()
            .mockResolvedValueOnce('result1')
            .mockResolvedValueOnce('result2');

        const options: EntryOptions<string> = {
            cacheKey: 'key',
            loader: loader,
            expiration: 15,
        };

        const entry = cache.fetch(options);

        await expect(entry.promise).resolves.toEqual('result1');

        expect(entry.result).toEqual('result1');

        const cachedEntry = cache.fetch(options);

        expect(cachedEntry).toBe(entry);

        expect(loader).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(15);

        const newEntry = cache.fetch(options);

        expect(newEntry).not.toBe(entry);

        await expect(newEntry.promise).resolves.toEqual('result2');

        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('should fetch and cache the value for undetermined time', async () => {
        jest.useFakeTimers();

        const cache = new Cache(10);

        const loader = jest.fn()
            .mockResolvedValueOnce('result1')
            .mockResolvedValueOnce('result2');

        const options: EntryOptions<string> = {
            cacheKey: 'key',
            loader: loader,
            expiration: -1,
        };

        const entry = cache.fetch(options);

        await expect(entry.promise).resolves.toEqual('result1');

        jest.advanceTimersByTime(60_000);

        const cachedEntry = cache.fetch(options);

        expect(cachedEntry).toBe(entry);
        expect(cachedEntry.result).toEqual('result1');

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should store the error on the entry on failure', async () => {
        const cache = new Cache(10);

        const error = new Error('failed');
        const loader = jest.fn().mockRejectedValue(error);

        const options: EntryOptions<string> = {
            cacheKey: 'key',
            loader: loader,
        };

        const entry = cache.fetch(options);

        await expect(entry.promise).rejects.toThrow(error);

        expect(entry.error).toBe(error);
        expect(entry.result).toBeUndefined();

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should cache the error', async () => {
        const cache = new Cache(10);

        const error = new Error('error');
        const loader = jest.fn().mockRejectedValue(error);

        const options: EntryOptions<string> = {
            cacheKey: 'key',
            loader: loader,
        };

        const entry = cache.fetch(options);

        await expect(entry.promise).rejects.toThrow(error);

        const cachedEntry = cache.fetch(options);

        expect(cachedEntry).toBe(entry);
        expect(cachedEntry.error).toBe(error);

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should provide the cached values', async () => {
        jest.useFakeTimers();

        const cache = new Cache(10);

        const loader = jest.fn().mockResolvedValue('loaded');
        const options: EntryOptions<string> = {
            cacheKey: 'key',
            loader: loader,
        };

        const entry = cache.fetch(options);

        await entry.promise;

        jest.advanceTimersByTime(9);

        const retrieved = cache.get(options.cacheKey);

        expect(retrieved).toBe(entry);
        expect(retrieved?.result).toBe('loaded');
        expect(retrieved?.promise).toBe(entry.promise);
        expect(retrieved?.timeout).not.toBeUndefined();
        expect(retrieved?.error).toBeUndefined();

        retrieved?.dispose();

        jest.advanceTimersByTime(9);

        expect(cache.get(options.cacheKey)).toBe(entry);

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should return undefined for a non-existent cache key', () => {
        const cache = new Cache(10);

        expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should reset the expiration timer on get', async () => {
        jest.useFakeTimers();

        const cache = new Cache(10);

        const loader = jest.fn()
            .mockResolvedValueOnce('result1')
            .mockResolvedValueOnce('result2');

        const options: EntryOptions<string> = {
            cacheKey: 'key',
            loader: loader,
        };

        const entry = cache.fetch(options);

        await entry.promise;

        jest.advanceTimersByTime(9);

        cache.get(options.cacheKey);

        jest.advanceTimersByTime(9);

        const cachedEntry = cache.fetch(options);

        expect(cachedEntry).toBe(entry);

        expect(loader).toHaveBeenCalledTimes(1);
    });
});
