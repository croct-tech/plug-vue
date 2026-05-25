import {h} from 'vue';
import {mount, flushPromises} from '@vue/test-utils';
import type {Plug} from '@croct/plug';
import {CROCT_INJECTION_KEY} from '../../plugin';
import {Personalization} from './index';

describe('Personalization', () => {
    let keyIndex = 0;

    function uniqueKey(): string {
        return `personalization-test-${++keyIndex}`;
    }

    beforeEach(() => {
        jest.resetAllMocks();
    });

    function mountPersonalization(
        props: Record<string, any>,
        slots: Record<string, any>,
        croct?: Partial<Plug>,
    ): ReturnType<typeof mount> {
        const plug = {
            evaluate: jest.fn(),
            ...croct,
        };

        return mount(Personalization as any, {
            props: props,
            slots: slots,
            global: {
                provide: {
                    [CROCT_INJECTION_KEY as symbol]: {plug: plug as Plug},
                },
            },
        });
    }

    it('should render the default slot with result on success', async () => {
        const evaluate = jest.fn().mockResolvedValue('developer');

        const wrapper = mountPersonalization(
            {query: "user's persona", cacheKey: uniqueKey()},
            {
                default: (props: any) => h('p', {}, `Hello, ${props.result}!`),
            },
            {evaluate: evaluate},
        );

        await flushPromises();

        expect(wrapper.html()).toBe('<p>Hello, developer!</p>');
    });

    it('should render the loading slot while loading', () => {
        const evaluate = jest.fn().mockReturnValue(new Promise(() => {}));

        const wrapper = mountPersonalization(
            {query: "user's name", cacheKey: uniqueKey()},
            {
                default: (props: any) => h('p', {}, props.result),
                loading: () => h('span', {}, 'Loading...'),
            },
            {evaluate: evaluate},
        );

        expect(wrapper.html()).toBe('<span>Loading...</span>');
    });

    it('should render the error slot on failure', async () => {
        const error = new Error('Evaluation failed');
        const evaluate = jest.fn().mockRejectedValue(error);

        const wrapper = mountPersonalization(
            {query: "user's name", cacheKey: uniqueKey()},
            {
                default: (props: any) => h('p', {}, props.result),
                error: (props: any) => h('p', {}, props.error.message),
            },
            {evaluate: evaluate},
        );

        await flushPromises();

        expect(wrapper.html()).toBe('<p>Evaluation failed</p>');
    });

    it('should render the default slot with initial value while loading', () => {
        const evaluate = jest.fn().mockReturnValue(new Promise(() => {}));

        const wrapper = mountPersonalization(
            {query: "user's name", cacheKey: uniqueKey(), initial: 'visitor'},
            {
                default: (props: any) => h('p', {}, `Hello, ${props.result}!`),
                loading: () => h('span', {}, 'Loading...'),
            },
            {evaluate: evaluate},
        );

        expect(wrapper.html()).toBe('<p>Hello, visitor!</p>');
    });

    it('should render the default slot with fallback value on error', async () => {
        const evaluate = jest.fn().mockRejectedValue(new Error('fail'));

        const wrapper = mountPersonalization(
            {query: "user's name", cacheKey: uniqueKey(), fallback: 'guest'},
            {
                default: (props: any) => h('p', {}, `Hello, ${props.result}!`),
                error: (props: any) => h('p', {}, props.error.message),
            },
            {evaluate: evaluate},
        );

        await flushPromises();

        expect(wrapper.html()).toContain('guest');
    });

    it('should render nothing when loading without a loading slot', () => {
        const evaluate = jest.fn().mockReturnValue(new Promise(() => {}));

        const wrapper = mountPersonalization(
            {query: "user's name", cacheKey: uniqueKey()},
            {
                default: (props: any) => h('p', {}, props.result),
            },
            {evaluate: evaluate},
        );

        expect(wrapper.html()).toBe('');
    });
});
