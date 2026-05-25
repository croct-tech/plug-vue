import {defineComponent, nextTick, ref} from 'vue';
import {mount, flushPromises} from '@vue/test-utils';
import {useLoader} from './useLoader';

describe('useLoader', () => {
    const cacheKey = {
        index: 0,
        next: function next(): string {
            this.index++;

            return this.current();
        },
        current: function current(): string {
            return `key-${this.index}`;
        },
    };

    beforeEach(() => {
        cacheKey.next();
        jest.resetAllMocks();
        jest.clearAllTimers();
    });

    it('should load the value and cache on success', async () => {
        const loader = jest.fn().mockResolvedValue('foo');

        let result: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        expect(result!.data.value).toBe('foo');
        expect(result!.isLoading.value).toBe(false);
        expect(result!.error.value).toBeNull();

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should set error on failure', async () => {
        const error = new Error('fail');
        const loader = jest.fn().mockRejectedValue(error);

        let result: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        expect(result!.error.value).toBe(error);
        expect(result!.isLoading.value).toBe(false);

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should set fallback value on error', async () => {
        const error = new Error('fail');
        const loader = jest.fn().mockRejectedValue(error);

        let result: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                            fallback: 'error-fallback',
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        expect(result!.data.value).toBe('error-fallback');
        expect(result!.error.value).toBe(error);
        expect(result!.isLoading.value).toBe(false);

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should return the initial state on the initial render', async () => {
        const loader = jest.fn(() => Promise.resolve('loaded'));

        let result: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            initial: 'loading',
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        expect(result!.data.value).toBe('loading');
        expect(result!.isLoading.value).toBe(true);

        await flushPromises();

        expect(result!.data.value).toBe('loaded');
        expect(result!.isLoading.value).toBe(false);
    });

    it('should update the initial state with the fallback state on error', async () => {
        const loader = jest.fn().mockRejectedValue(new Error('fail'));

        let result: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            initial: 'loading',
                            fallback: 'error',
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        expect(result!.data.value).toBe('loading');

        await flushPromises();

        expect(result!.data.value).toBe('error');
    });

    it('should extend the cache expiration on every access', async () => {
        jest.useFakeTimers();

        const loader = jest.fn().mockResolvedValue('foo');

        mount(
            defineComponent({
                setup: function () {
                    useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                            expiration: 15,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        jest.advanceTimersByTime(14);

        const loader2 = jest.fn().mockResolvedValue('bar');

        let result2: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result2 = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader2,
                            expiration: 15,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        expect(result2!.data.value).toBe('foo');
        expect(loader2).not.toHaveBeenCalled();

        jest.advanceTimersByTime(15);

        mount(
            defineComponent({
                setup: function () {
                    useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader2,
                            expiration: 15,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        expect(loader2).toHaveBeenCalledTimes(1);
    });

    it('should not expire the cache when the expiration is negative', async () => {
        jest.useFakeTimers();

        const loader = jest.fn(
            () => new Promise(resolve => {
                setTimeout(() => resolve('foo'), 10);
            }),
        );

        mount(
            defineComponent({
                setup: function () {
                    useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                            expiration: -1,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        jest.advanceTimersByTime(10);

        await flushPromises();

        const loader2 = jest.fn().mockResolvedValue('bar');

        let result: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader2,
                            expiration: -1,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        expect(result!.data.value).toBe('foo');
        expect(loader2).not.toHaveBeenCalled();
    });

    it('should reload the value when the cache key changes', async () => {
        const loader = jest.fn()
            .mockResolvedValueOnce('foo')
            .mockResolvedValueOnce('bar');

        const key = ref(cacheKey.current());

        let result: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result = useLoader(
                        () => ({
                            cacheKey: key.value,
                            initial: 'first content',
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        expect(result!.data.value).toBe('foo');
        expect(loader).toHaveBeenCalledTimes(1);

        key.value = cacheKey.next();

        await nextTick();

        expect(result!.data.value).toBe('first content');
        expect(result!.isLoading.value).toBe(true);

        await flushPromises();

        expect(result!.data.value).toBe('bar');
        expect(result!.isLoading.value).toBe(false);

        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('should return cached error on subsequent access', async () => {
        const error = new Error('fail');
        const loader = jest.fn().mockRejectedValue(error);

        let result1: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result1 = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                            fallback: 'fallback-value',
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        expect(result1!.data.value).toBe('fallback-value');
        expect(result1!.error.value).toBe(error);

        let result2: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result2 = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                            fallback: 'fallback-value',
                        }),
                    );

                    return () => null;
                },
            }),
        );

        expect(result2!.data.value).toBe('fallback-value');
        expect(result2!.error.value).toBe(error);
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should return cached error without fallback on subsequent access', async () => {
        const error = new Error('fail');
        const loader = jest.fn().mockRejectedValue(error);

        let result1: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result1 = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        expect(result1!.error.value).toBe(error);
        expect(result1!.data.value).toBeUndefined();

        let result2: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result2 = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        expect(result2!.error.value).toBe(error);
        expect(result2!.data.value).toBeUndefined();
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should not update refs after unmount', async () => {
        const loader = jest.fn().mockResolvedValue('result');

        let result: ReturnType<typeof useLoader> | undefined;

        const wrapper = mount(
            defineComponent({
                setup: function () {
                    result = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            initial: 'initial',
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        expect(result!.data.value).toBe('initial');

        wrapper.unmount();

        await flushPromises();

        expect(result!.data.value).toBe('initial');
    });

    it.each<[number, number | undefined]>(
        [
            // [Expected elapsed time, Expiration]
            [60_000, undefined],
            [15_000, 15_000],
        ],
    )('should cache the values for %d milliseconds', async (step, expiration) => {
        jest.useFakeTimers();

        const delay = 10;
        const loader = jest.fn(
            () => new Promise(resolve => {
                setTimeout(() => resolve('foo'), delay);
            }),
        );

        let result1: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result1 = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            expiration: expiration,
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        jest.advanceTimersByTime(delay);

        await flushPromises();

        expect(result1!.data.value).toBe('foo');

        let result2: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result2 = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            expiration: expiration,
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        expect(result2!.data.value).toBe('foo');
        expect(loader).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(step);

        let result3: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result3 = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            expiration: expiration,
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        jest.advanceTimersByTime(delay);

        await flushPromises();

        expect(result3!.data.value).toBe('foo');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('should coerce non-Error thrown values to Error in async path', async () => {
        const loader = jest.fn().mockRejectedValue('string-error');

        let result: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        expect(result!.error.value).toBeInstanceOf(Error);
        expect(result!.error.value!.message).toBe('string-error');
    });

    it('should coerce non-Error cached values to Error on subsequent access', async () => {
        const loader = jest.fn().mockRejectedValue('cached-string-error');

        mount(
            defineComponent({
                setup: function () {
                    useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        await flushPromises();

        let result2: ReturnType<typeof useLoader> | undefined;

        mount(
            defineComponent({
                setup: function () {
                    result2 = useLoader(
                        () => ({
                            cacheKey: cacheKey.current(),
                            loader: loader,
                        }),
                    );

                    return () => null;
                },
            }),
        );

        expect(result2!.error.value).toBeInstanceOf(Error);
        expect(result2!.error.value!.message).toBe('cached-string-error');
    });
});
