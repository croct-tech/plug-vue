/*
 * @jest-environment node
 */
import {createSSRApp, defineComponent} from 'vue';
import {renderToString} from 'vue/server-renderer';
import {createCroct} from '../plugin';
import {useEvaluation} from './useEvaluation';

jest.mock(
    '../ssr-polyfills',
    () => ({
        __esModule: true,
        ...jest.requireActual('../ssr-polyfills'),
        isSsr: (): boolean => true,
    }),
);

describe('useEvaluation (SSR)', () => {
    it('should render the initial value on the server-side', async () => {
        let result: ReturnType<typeof useEvaluation> | undefined;

        const app = createSSRApp(
            defineComponent({
                setup: function () {
                    result = useEvaluation('location', {initial: 'foo'});

                    return () => `${result!.data.value}`;
                },
            }),
        );

        app.use(createCroct({appId: '00000000-0000-0000-0000-000000000000'}));

        await renderToString(app);

        expect(result!.data.value).toBe('foo');
        expect(result!.isLoading.value).toBe(false);
        expect(result!.error.value).toBeNull();
    });

    it('should require an initial value for server-side rendering', () => {
        expect(
            () => useEvaluation('location'),
        ).toThrow('The initial value is required for server-side rendering (SSR).');
    });
});
