import {defineComponent, nextTick, ref} from 'vue';
import {mount, flushPromises} from '@vue/test-utils';
import {getSlotContent} from '@croct/content';
import type {Plug} from '@croct/plug';
import {CROCT_INJECTION_KEY} from '../plugin';
import {useContent} from './useContent';

jest.mock(
    '@croct/content',
    () => ({
        __esModule: true,
        getSlotContent: jest.fn().mockReturnValue(null),
    }),
);

describe('useContent (CSR)', () => {
    let keyIndex = 0;

    function uniqueKey(): string {
        return `content-test-${++keyIndex}`;
    }

    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(getSlotContent).mockReturnValue(null);
    });

    function mountWithCroct(setup: () => any, croct?: Partial<Plug>): ReturnType<typeof mount> {
        const plug = {
            fetch: jest.fn(),
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

    it('should fetch the content', async () => {
        const fetch = jest.fn().mockResolvedValue({
            metadata: {
                version: '1.0',
                contentSource: 'slot',
            },
            content: {title: 'foo'},
        });

        let result: ReturnType<typeof useContent> | undefined;

        mountWithCroct(
            () => {
                result = useContent('home-banner@1', {
                    preferredLocale: 'en',
                    attributes: {example: 'value'},
                    cacheKey: uniqueKey(),
                    fallback: {title: 'error'},
                    expiration: 50,
                });
            },
            {fetch: fetch},
        );

        expect(fetch).toHaveBeenCalledWith('home-banner@1', {
            fallback: {title: 'error'},
            preferredLocale: 'en',
            attributes: {example: 'value'},
        });

        await flushPromises();

        expect(result!.data.value).toEqual({title: 'foo'});
        expect(result!.metadata.value).toEqual({
            version: '1.0',
            contentSource: 'slot',
        });
        expect(result!.isLoading.value).toBe(false);
        expect(result!.error.value).toBeNull();
    });

    it('should use the default content as initial value if not provided', () => {
        const content = {foo: 'bar'};
        const slotId = 'slot-id';
        const preferredLocale = 'en';

        jest.mocked(getSlotContent).mockReturnValue(content);

        const fetch = jest.fn().mockResolvedValue({content: content});

        let result: ReturnType<typeof useContent> | undefined;

        mountWithCroct(
            () => {
                result = useContent(slotId, {
                    preferredLocale: preferredLocale,
                    cacheKey: uniqueKey(),
                });
            },
            {fetch: fetch},
        );

        expect(getSlotContent).toHaveBeenCalledWith(slotId, preferredLocale);

        expect(result!.data.value).toEqual(content);
    });

    it('should use the provided initial value', () => {
        const initial = null;
        const slotId = 'slot-id';

        jest.mocked(getSlotContent).mockReturnValue(null);

        const fetch = jest.fn().mockResolvedValue({content: {}});

        let result: ReturnType<typeof useContent> | undefined;

        mountWithCroct(
            () => {
                result = useContent(slotId, {
                    preferredLocale: 'en',
                    initial: initial,
                    cacheKey: uniqueKey(),
                });
            },
            {fetch: fetch},
        );

        expect(result!.data.value).toEqual(initial);
    });

    it('should use the default content as fallback value if not provided', () => {
        const content = {foo: 'bar'};
        const slotId = 'slot-id';
        const preferredLocale = 'en';

        jest.mocked(getSlotContent).mockReturnValue(content);

        const fetch = jest.fn().mockResolvedValue({content: {}});

        mountWithCroct(
            () => {
                useContent(slotId, {
                    preferredLocale: preferredLocale,
                    fallback: content,
                    cacheKey: uniqueKey(),
                });
            },
            {fetch: fetch},
        );

        expect(getSlotContent).toHaveBeenCalledWith(slotId, preferredLocale);

        expect(fetch).toHaveBeenCalledWith(slotId, {
            fallback: content,
            preferredLocale: preferredLocale,
        });
    });

    it('should normalize an empty preferred locale to undefined', () => {
        const fetch = jest.fn().mockResolvedValue({content: {}});

        mountWithCroct(
            () => {
                useContent('slot-id', {
                    preferredLocale: '',
                    cacheKey: uniqueKey(),
                });
            },
            {fetch: fetch},
        );

        expect(jest.mocked(fetch).mock.calls[0][1]).toStrictEqual({});
    });

    it('should return the metadata separately from the content', async () => {
        const fetch = jest.fn().mockResolvedValue({
            metadata: {
                version: '1.0',
                contentSource: 'slot',
            },
            content: {title: 'foo'},
        });

        let result: ReturnType<typeof useContent> | undefined;

        mountWithCroct(
            () => {
                result = useContent('home-banner@1', {cacheKey: uniqueKey()});
            },
            {fetch: fetch},
        );

        await flushPromises();

        expect(result!.data.value).toEqual({title: 'foo'});
        expect(result!.metadata.value).toEqual({
            version: '1.0',
            contentSource: 'slot',
        });
    });

    it('should use the last result as initial when staleWhileLoading is true', async () => {
        const fetch = jest.fn().mockResolvedValue({content: {title: 'Loaded'}});

        let result: ReturnType<typeof useContent> | undefined;

        mountWithCroct(
            () => {
                result = useContent('home-banner@1', {
                    initial: {title: 'initial'},
                    cacheKey: uniqueKey(),
                    staleWhileLoading: true,
                });
            },
            {fetch: fetch},
        );

        expect(result!.data.value).toEqual({title: 'initial'});

        await flushPromises();

        expect(result!.data.value).toEqual({title: 'Loaded'});
    });

    it('should react to changes in options getter', async () => {
        const fetch = jest.fn()
            .mockResolvedValueOnce({content: {title: 'first'}})
            .mockResolvedValueOnce({content: {title: 'second'}});

        const key = ref('content-key-a');

        let result: ReturnType<typeof useContent> | undefined;

        mountWithCroct(
            () => {
                result = useContent(
                    'slot-id',
                    () => ({
                        cacheKey: key.value,
                        initial: {title: 'init'},
                    }),
                );
            },
            {fetch: fetch},
        );

        await flushPromises();

        expect(result!.data.value).toEqual({title: 'first'});

        key.value = 'content-key-b';

        await nextTick();

        expect(result!.isLoading.value).toBe(true);

        await flushPromises();

        expect(result!.data.value).toEqual({title: 'second'});
    });

    it('should keep stale data visible when cache key changes with staleWhileLoading', async () => {
        const fetch = jest.fn()
            .mockResolvedValueOnce({content: {title: 'first'}})
            .mockResolvedValueOnce({content: {title: 'second'}});

        const key = ref('swl-content-a');

        let result: ReturnType<typeof useContent> | undefined;

        mountWithCroct(
            () => {
                result = useContent(
                    'slot-id',
                    () => ({
                        cacheKey: key.value,
                        initial: {title: 'init'},
                        staleWhileLoading: true,
                    }),
                );
            },
            {fetch: fetch},
        );

        await flushPromises();

        expect(result!.data.value).toEqual({title: 'first'});

        key.value = 'swl-content-b';

        await nextTick();
        await nextTick();

        // Stale value should remain, not revert to 'init'
        expect(result!.data.value).toEqual({title: 'first'});
        expect(result!.isLoading.value).toBe(true);

        await flushPromises();

        expect(result!.data.value).toEqual({title: 'second'});
    });
});
