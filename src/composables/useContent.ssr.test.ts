/*
 * @jest-environment node
 */
import {getSlotContent} from '@croct/content';
import {useContent} from './useContent';

jest.mock(
    '../ssr-polyfills',
    () => ({
        __esModule: true,
        ...jest.requireActual('../ssr-polyfills'),
        isSsr: (): boolean => true,
    }),
);

jest.mock(
    '@croct/content',
    () => ({
        __esModule: true,
        getSlotContent: jest.fn().mockReturnValue(null),
    }),
);

describe('useContent (SSR)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the initial value on the server-side', () => {
        const result = useContent('slot-id', {initial: 'foo'});

        expect(result.data.value).toEqual('foo');
        expect(result.metadata.value).toBeUndefined();
        expect(result.isLoading.value).toBe(false);
        expect(result.error.value).toBeNull();
    });

    it('should require an initial value for server-side rendering', () => {
        expect(() => useContent('slot-id'))
            .toThrow('The initial content is required for server-side rendering (SSR).');
    });

    it('should use the default content as initial value on the server-side if not provided', () => {
        const content = {foo: 'bar'};
        const slotId = 'slot-id';
        const preferredLocale = 'en';

        jest.mocked(getSlotContent).mockReturnValue(content);

        const result = useContent(slotId, {preferredLocale: preferredLocale});

        expect(getSlotContent).toHaveBeenCalledWith(slotId, preferredLocale);

        expect(result.data.value).toEqual(content);
    });

    it('should use the provided initial value on the server-side', () => {
        const initial = null;
        const slotId = 'slot-id';
        const preferredLocale = 'en';

        jest.mocked(getSlotContent).mockReturnValue(null);

        const result = useContent(slotId, {
            preferredLocale: preferredLocale,
            initial: initial,
        });

        expect(result.data.value).toEqual(initial);
    });

    it('should normalize an empty preferred locale to undefined', () => {
        const slotId = 'slot-id';
        const preferredLocale = '';

        jest.mocked(getSlotContent).mockReturnValue({
            foo: 'bar',
        });

        useContent(slotId, {
            preferredLocale: preferredLocale,
        });

        expect(getSlotContent).toHaveBeenCalledWith(slotId, undefined);
    });
});
