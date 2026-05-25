import {h} from 'vue';
import {mount, flushPromises} from '@vue/test-utils';
import type {Plug} from '@croct/plug';
import {CROCT_INJECTION_KEY} from '../../plugin';
import {SlotContent} from './index';

jest.mock(
    '@croct/content',
    () => ({
        __esModule: true,
        getSlotContent: jest.fn().mockReturnValue(null),
    }),
);

describe('SlotContent', () => {
    let keyIndex = 0;

    function uniqueKey(): string {
        return `slot-content-test-${++keyIndex}`;
    }

    beforeEach(() => {
        jest.resetAllMocks();
    });

    function mountSlotContent(
        props: Record<string, any>,
        slots: Record<string, any>,
        croct?: Partial<Plug>,
    ): ReturnType<typeof mount> {
        const plug = {
            fetch: jest.fn(),
            ...croct,
        };

        return mount(SlotContent as any, {
            props: props,
            slots: slots,
            global: {
                provide: {
                    [CROCT_INJECTION_KEY as symbol]: {plug: plug as Plug},
                },
            },
        });
    }

    it('should render the default slot with content on success', async () => {
        const response = {
            content: {title: 'Hello'},
            metadata: {
                version: '1.0',
                contentSource: 'slot',
            },
        };

        const fetch = jest.fn().mockResolvedValue(response);

        const wrapper = mountSlotContent(
            {
                id: 'hero@1',
                cacheKey: uniqueKey(),
            },
            {default: (props: any) => h('h1', {}, props.content.title)},
            {fetch: fetch},
        );

        await flushPromises();

        expect(wrapper.html()).toBe('<h1>Hello</h1>');
    });

    it('should render the loading slot while loading', () => {
        const fetch = jest.fn().mockReturnValue(new Promise(() => {}));

        const wrapper = mountSlotContent(
            {
                id: 'hero@1',
                cacheKey: uniqueKey(),
            },
            {
                default: () => h('div', {}, 'content'),
                loading: () => h('span', {}, 'Loading...'),
            },
            {fetch: fetch},
        );

        expect(wrapper.html()).toBe('<span>Loading...</span>');
    });

    it('should render the error slot on failure', async () => {
        const error = new Error('Network error');
        const fetch = jest.fn().mockRejectedValue(error);

        const wrapper = mountSlotContent(
            {
                id: 'hero@1',
                cacheKey: uniqueKey(),
            },
            {
                default: () => h('div', {}, 'content'),
                error: (props: any) => h('p', {}, props.error.message),
            },
            {fetch: fetch},
        );

        await flushPromises();

        expect(wrapper.html()).toBe('<p>Network error</p>');
    });

    it('should render the default slot with initial value while loading', () => {
        const fetch = jest.fn().mockReturnValue(new Promise(() => {}));

        const wrapper = mountSlotContent(
            {
                id: 'hero@1',
                cacheKey: uniqueKey(),
                initial: {title: 'Default'},
            },
            {
                default: (props: any) => h('h1', {}, props.content.title),
                loading: () => h('span', {}, 'Loading...'),
            },
            {fetch: fetch},
        );

        expect(wrapper.html()).toBe('<h1>Default</h1>');
    });

    it('should render the default slot with fallback value on error', async () => {
        const fetch = jest.fn().mockResolvedValue({content: {title: 'Fallback'}});

        const wrapper = mountSlotContent(
            {
                id: 'hero@1',
                cacheKey: uniqueKey(),
                fallback: {title: 'Fallback'},
            },
            {
                default: (props: any) => h('h1', {}, props.content.title),
                error: (props: any) => h('p', {}, props.error.message),
            },
            {fetch: fetch},
        );

        await flushPromises();

        expect(wrapper.html()).toBe('<h1>Fallback</h1>');
    });

    it('should render nothing when loading without a loading slot', () => {
        const fetch = jest.fn().mockReturnValue(new Promise(() => {}));

        const wrapper = mountSlotContent(
            {
                id: 'hero@1',
                cacheKey: uniqueKey(),
            },
            {default: () => h('div', {}, 'content')},
            {fetch: fetch},
        );

        expect(wrapper.html()).toBe('');
    });

    it('should pass metadata to the default slot when available', async () => {
        const response = {
            content: {title: 'Hello'},
            metadata: {
                version: '2.0',
                contentSource: 'slot',
            },
        };

        const fetch = jest.fn().mockResolvedValue(response);

        const wrapper = mountSlotContent(
            {
                id: 'hero@1',
                cacheKey: uniqueKey(),
            },
            {default: (props: any) => h('span', {}, `${props.content.title}-${props.metadata.version}`)},
            {fetch: fetch},
        );

        await flushPromises();

        expect(wrapper.html()).toBe('<span>Hello-2.0</span>');
    });

    it('should render without metadata when not returned', async () => {
        const fetch = jest.fn().mockResolvedValue({content: {title: 'NoMeta'}});

        const wrapper = mountSlotContent(
            {
                id: 'hero@1',
                cacheKey: uniqueKey(),
            },
            {default: (props: any) => h('span', {}, `${props.content.title}-${String(props.metadata)}`)},
            {fetch: fetch},
        );

        await flushPromises();

        expect(wrapper.html()).toBe('<span>NoMeta-undefined</span>');
    });
});
