/*
 * @jest-environment node
 */
import {createSSRApp, defineComponent} from 'vue';
import {renderToString} from 'vue/server-renderer';
import {createCroct} from '../plugin';
import {useCroct} from './useCroct';

jest.mock(
    '../ssr-polyfills',
    () => ({
        __esModule: true,
        ...jest.requireActual('../ssr-polyfills'),
        isSsr: (): boolean => true,
    }),
);

describe('useCroct (SSR)', () => {
    it('should not fail on server-side rendering', async () => {
        const app = createSSRApp(
            defineComponent({
                setup: function () {
                    const croct = useCroct();

                    return () => `${typeof croct}`;
                },
            }),
        );

        app.use(createCroct({appId: '00000000-0000-0000-0000-000000000000'}));

        const html = await renderToString(app);

        expect(html).toBeDefined();
    });
});
