import type {Plug} from '@croct/plug';
import {inject} from 'vue';
import {CROCT_INJECTION_KEY} from '../plugin';

export function useCroct(): Plug {
    const context = inject(CROCT_INJECTION_KEY);

    if (context === undefined) {
        throw new Error(
            'useCroct() requires the Croct plugin to be installed. '
            + 'For help, see https://croct.help/sdk/vue/missing-plugin',
        );
    }

    return context.plug;
}
