import type {Plug} from '@croct/plug';
import {GlobalPlug} from '@croct/plug/plug';

/**
 * @internal
 */
export function isSsr(): boolean {
    return globalThis.window?.document?.createElement === undefined;
}

/**
 * @internal
 */
export const croct: Plug = !isSsr()
    ? (function factory(): Plug {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let resolveCallback: () => void;
        let rejectCallback: (reason: any) => void;

        return new Proxy(GlobalPlug.GLOBAL, {
            get: function getProperty(target, property: keyof Plug): any {
                switch (property) {
                    case 'plug':
                        if (timeoutId !== null) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                            rejectCallback?.(new Error('Unplug cancelled.'));
                        }

                        break;

                    case 'unplug':
                        return () => {
                            timeoutId = setTimeout(() => target.unplug().then(resolveCallback, rejectCallback), 100);

                            return new Promise<void>((resolve, reject) => {
                                resolveCallback = resolve;
                                rejectCallback = reject;
                            });
                        };
                }

                return target[property];
            },
        });
    }())
    : new Proxy(GlobalPlug.GLOBAL, {
        get: function getProperty(_, property: keyof Plug): any {
            switch (property) {
                case 'initialized':
                    return false;

                case 'plug':
                    return () => {
                        // no-op
                    };

                case 'unplug':
                    return () => Promise.resolve();

                default:
                    throw new Error(
                        `Property croct.${String(property)} is not supported on server-side (SSR). `
                        + 'Consider refactoring the logic as a side-effect (onMounted) or a client-side callback '
                        + '(onClick, onChange, etc). '
                        + 'For help, see https://croct.help/sdk/vue/client-logic-ssr',
                    );
            }
        },
    });
