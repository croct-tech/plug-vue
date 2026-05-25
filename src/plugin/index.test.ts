import {createApp, defineComponent, inject} from 'vue';
import type {Plug} from '@croct/plug';
import {croct} from '../ssr-polyfills';
import type {CroctPluginOptions} from './index';
import {CROCT_INJECTION_KEY, createCroct} from './index';

jest.mock(
    '../ssr-polyfills',
    () => ({
        ...jest.requireActual('../ssr-polyfills'),
        croct: {
            plug: jest.fn(),
            unplug: jest.fn().mockResolvedValue(undefined),
            plugged: true,
            initialized: false,
        },
    }),
);

describe('createCroct', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should plug on install', () => {
        const options: CroctPluginOptions = {
            appId: '00000000-0000-0000-0000-000000000000',
            debug: true,
            track: true,
        };

        const app = createApp({render: () => null});

        app.use(createCroct(options));

        expect(croct.plug).toHaveBeenCalledWith(options);
    });

    it('should provide the context via injection', () => {
        const options: CroctPluginOptions = {
            appId: '00000000-0000-0000-0000-000000000000',
        };

        let context: {plug: Plug} | undefined;

        const app = createApp(
            defineComponent({
                setup: function () {
                    context = inject(CROCT_INJECTION_KEY);

                    return () => null;
                },
            }),
        );

        app.use(createCroct(options));

        const root = document.createElement('div');

        app.mount(root);

        expect(context).toBeDefined();
    });

    it('should initialize the Plug when accessed', () => {
        const options: CroctPluginOptions = {
            appId: '00000000-0000-0000-0000-000000000000',
            debug: true,
            track: true,
        };

        let initialized = false;

        Object.defineProperty(croct, 'initialized', {
            get: jest.fn().mockImplementation(() => initialized),
            configurable: true,
        });

        jest.mocked(croct.plug).mockImplementation(() => {
            initialized = true;
        });

        let plug: Plug | undefined;

        const app = createApp(
            defineComponent({
                setup: function () {
                    const context = inject(CROCT_INJECTION_KEY);

                    plug = context?.plug;

                    return () => null;
                },
            }),
        );

        app.use(createCroct(options));

        const root = document.createElement('div');

        app.mount(root);

        expect(plug).toBeDefined();

        expect(croct.plug).toHaveBeenCalledWith(options);
    });

    it('should unplug on unmount', () => {
        const options: CroctPluginOptions = {
            appId: '00000000-0000-0000-0000-000000000000',
        };

        const app = createApp({render: () => null});

        app.use(createCroct(options));

        const root = document.createElement('div');

        app.mount(root);

        app.unmount();

        expect(croct.unplug).toHaveBeenCalled();
    });

    it('should ignore errors on unmount', () => {
        jest.mocked(croct.unplug).mockRejectedValue(new Error('foo'));

        const options: CroctPluginOptions = {
            appId: '00000000-0000-0000-0000-000000000000',
        };

        const app = createApp({render: () => null});

        app.use(createCroct(options));

        const root = document.createElement('div');

        app.mount(root);

        expect(() => app.unmount()).not.toThrow();
    });

    it('should allow to plug after unmount', () => {
        const options: CroctPluginOptions = {
            appId: '00000000-0000-0000-0000-000000000000',
            debug: true,
            track: true,
        };

        let plug: Plug | undefined;

        const app = createApp(
            defineComponent({
                setup: function () {
                    const context = inject(CROCT_INJECTION_KEY);

                    plug = context?.plug;

                    return () => null;
                },
            }),
        );

        app.use(createCroct(options));

        const root = document.createElement('div');

        app.mount(root);

        const appId = '11111111-1111-1111-1111-111111111111';

        plug?.plug({appId: appId});

        expect(plug?.plugged).toBe(croct.plugged);

        expect(croct.plug).toHaveBeenLastCalledWith({
            ...options,
            appId: appId,
        });
    });

    it('should skip double install', () => {
        const options: CroctPluginOptions = {
            appId: '00000000-0000-0000-0000-000000000000',
        };

        const plugin = createCroct(options);

        const app1 = createApp({render: () => null});
        const app2 = createApp({render: () => null});

        app1.use(plugin);
        app2.use(plugin);

        expect(croct.plug).toHaveBeenCalledTimes(1);
    });

    it('should fall back to monkey-patching unmount when onUnmount is not available', () => {
        const options: CroctPluginOptions = {
            appId: '00000000-0000-0000-0000-000000000000',
        };

        const app = createApp({render: () => null});

        delete (app as any).onUnmount;

        app.use(createCroct(options));

        const root = document.createElement('div');

        app.mount(root);

        app.unmount();

        expect(croct.unplug).toHaveBeenCalled();
    });
});
