import {defineComponent, nextTick, ref} from 'vue';
import {mount, flushPromises} from '@vue/test-utils';
import type {EvaluationOptions} from '@croct/sdk/facade/evaluatorFacade';
import type {Plug} from '@croct/plug';
import {CROCT_INJECTION_KEY} from '../plugin';
import {useEvaluation} from './useEvaluation';

describe('useEvaluation', () => {
    let keyIndex = 0;

    function uniqueKey(): string {
        return `eval-test-${++keyIndex}`;
    }

    beforeEach(() => {
        jest.resetAllMocks();
    });

    function mountWithCroct(setup: () => any, croct?: Partial<Plug>): ReturnType<typeof mount> {
        const plug = {
            evaluate: jest.fn(),
            ...croct,
        };

        return mount(
            defineComponent({
                setup: setup,
                render: () => null,
            }),
            {
                global: {
                    provide: {
                        [CROCT_INJECTION_KEY as symbol]: {plug: plug as Plug},
                    },
                },
            },
        );
    }

    it('should evaluate a query', async () => {
        const evaluationOptions: EvaluationOptions = {
            timeout: 100,
            attributes: {foo: 'bar'},
        };

        const evaluate = jest.fn().mockResolvedValue('foo');

        let result: ReturnType<typeof useEvaluation> | undefined;

        mountWithCroct(
            () => {
                result = useEvaluation('location', {
                    ...evaluationOptions,
                    cacheKey: uniqueKey(),
                    fallback: 'error',
                    expiration: 50,
                });
            },
            {evaluate: evaluate},
        );

        expect(evaluate).toHaveBeenCalledWith('location', evaluationOptions);

        await flushPromises();

        expect(result!.data.value).toBe('foo');
        expect(result!.isLoading.value).toBe(false);
        expect(result!.error.value).toBeNull();
    });

    it('should remove undefined evaluation options', () => {
        const evaluate = jest.fn().mockResolvedValue('foo');

        mountWithCroct(
            () => {
                useEvaluation('location', {
                    timeout: undefined,
                    attributes: undefined,
                    cacheKey: uniqueKey(),
                });
            },
            {evaluate: evaluate},
        );

        expect(evaluate).toHaveBeenCalledWith('location', {});
    });

    it('should use the initial value when loading', async () => {
        const evaluate = jest.fn().mockResolvedValue('loaded');

        let result: ReturnType<typeof useEvaluation> | undefined;

        mountWithCroct(
            () => {
                result = useEvaluation('location', {
                    initial: 'initial',
                    cacheKey: uniqueKey(),
                });
            },
            {evaluate: evaluate},
        );

        expect(result!.data.value).toBe('initial');
        expect(result!.isLoading.value).toBe(true);

        await flushPromises();

        expect(result!.data.value).toBe('loaded');
        expect(result!.isLoading.value).toBe(false);
    });

    it('should use the fallback value on error', async () => {
        const error = new Error('failed');
        const evaluate = jest.fn().mockRejectedValue(error);

        let result: ReturnType<typeof useEvaluation> | undefined;

        mountWithCroct(
            () => {
                result = useEvaluation('location', {
                    fallback: 'error-fallback',
                    cacheKey: uniqueKey(),
                });
            },
            {evaluate: evaluate},
        );

        await flushPromises();

        expect(result!.data.value).toBe('error-fallback');
        expect(result!.error.value).toBe(error);
        expect(result!.isLoading.value).toBe(false);
    });

    it('should generate a cache key from the query and attributes', async () => {
        const key = uniqueKey();
        const evaluate = jest.fn().mockResolvedValue('foo');

        let result1: ReturnType<typeof useEvaluation> | undefined;

        mountWithCroct(
            () => {
                result1 = useEvaluation('location', {
                    cacheKey: key,
                    attributes: {foo: 'bar'},
                });
            },
            {evaluate: evaluate},
        );

        await flushPromises();

        expect(result1!.data.value).toBe('foo');
        expect(evaluate).toHaveBeenCalledTimes(1);

        let result2: ReturnType<typeof useEvaluation> | undefined;

        mountWithCroct(
            () => {
                result2 = useEvaluation('location', {
                    cacheKey: key,
                    attributes: {foo: 'bar'},
                });
            },
            {evaluate: evaluate},
        );

        expect(result2!.data.value).toBe('foo');
        expect(evaluate).toHaveBeenCalledTimes(1);
    });

    it('should use the last result as initial when staleWhileLoading is true', async () => {
        const evaluate = jest.fn().mockResolvedValue('loaded');

        let result: ReturnType<typeof useEvaluation> | undefined;

        mountWithCroct(
            () => {
                result = useEvaluation('location', {
                    initial: 'initial',
                    cacheKey: uniqueKey(),
                    staleWhileLoading: true,
                });
            },
            {evaluate: evaluate},
        );

        expect(result!.data.value).toBe('initial');

        await flushPromises();

        expect(result!.data.value).toBe('loaded');
    });

    it('should react to changes in options getter', async () => {
        const evaluate = jest.fn()
            .mockResolvedValueOnce('first')
            .mockResolvedValueOnce('second');

        const key = ref('key-a');

        let result: ReturnType<typeof useEvaluation> | undefined;

        mountWithCroct(
            () => {
                result = useEvaluation(
                    'location',
                    () => ({
                        cacheKey: key.value,
                        initial: 'init',
                    }),
                );
            },
            {evaluate: evaluate},
        );

        await flushPromises();

        expect(result!.data.value).toBe('first');

        key.value = 'key-b';

        await nextTick();

        expect(result!.isLoading.value).toBe(true);

        await flushPromises();

        expect(result!.data.value).toBe('second');
    });

    it('should keep stale data visible when cache key changes with staleWhileLoading', async () => {
        const evaluate = jest.fn()
            .mockResolvedValueOnce('first-result')
            .mockResolvedValueOnce('second-result');

        const key = ref('swl-key-a');

        let result: ReturnType<typeof useEvaluation> | undefined;

        mountWithCroct(
            () => {
                result = useEvaluation(
                    'location',
                    () => ({
                        cacheKey: key.value,
                        initial: 'init',
                        staleWhileLoading: true,
                    }),
                );
            },
            {evaluate: evaluate},
        );

        await flushPromises();

        expect(result!.data.value).toBe('first-result');

        key.value = 'swl-key-b';

        await nextTick();

        // Stale value should remain, not revert to 'init'
        expect(result!.data.value).toBe('first-result');
        expect(result!.isLoading.value).toBe(true);

        await flushPromises();

        expect(result!.data.value).toBe('second-result');
    });
});
