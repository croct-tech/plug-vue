import {defineComponent} from 'vue';
import {mount} from '@vue/test-utils';
import croct from '@croct/plug';
import {CROCT_INJECTION_KEY} from '../plugin';
import {useCroct} from './useCroct';

describe('useCroct', () => {
    it('should fail if used without the plugin installed', () => {
        const spy = jest.spyOn(console, 'warn').mockImplementation();

        expect(
            () => mount(
                defineComponent({
                    setup: function () {
                        useCroct();

                        return () => null;
                    },
                }),
            ),
        ).toThrow('useCroct() requires the Croct plugin to be installed.');

        spy.mockRestore();
    });

    it('should return the Plug instance', () => {
        let plug: any;

        mount(
            defineComponent({
                setup: function () {
                    plug = useCroct();

                    return () => null;
                },
            }),
            {
                global: {
                    provide: {
                        [CROCT_INJECTION_KEY as symbol]: {plug: croct},
                    },
                },
            },
        );

        expect(plug).toBe(croct);
    });
});
