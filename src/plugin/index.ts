import type {App, InjectionKey, Plugin} from 'vue';
import type {Configuration, Plug} from '@croct/plug';
import {croct} from '../ssr-polyfills';

export type CroctPluginOptions = Configuration & Required<Pick<Configuration, 'appId'>>;

export type CroctContext = {plug: Plug};

export const CROCT_INJECTION_KEY: InjectionKey<CroctContext> = Symbol('CroctContext');

export function createCroct(options: CroctPluginOptions): Plugin {
    let installed = false;

    return {
        install: function (app: App): void {
            if (installed) {
                return;
            }

            installed = true;

            const currentOptions = options;

            const context: CroctContext = {
                get plug(): Plug {
                    if (!croct.initialized) {
                        croct.plug(currentOptions);
                    }

                    return new Proxy(croct, {
                        get: function getProperty(target, property: keyof Plug): any {
                            if (property === 'plug') {
                                return (overrides: Configuration): void => {
                                    target.plug({
                                        ...currentOptions,
                                        ...overrides,
                                    });
                                };
                            }

                            return target[property];
                        },
                    });
                },
            };

            app.provide(CROCT_INJECTION_KEY, context);

            croct.plug(currentOptions);

            const cleanup = (): void => {
                croct.unplug().catch(() => {
                    // Suppress errors.
                });
            };

            if ('onUnmount' in app && typeof app.onUnmount === 'function') {
                app.onUnmount(cleanup);
            } else {
                const originalUnmount = app.unmount.bind(app);

                // eslint-disable-next-line no-param-reassign -- fallback for Vue <3.5
                app.unmount = (): void => {
                    cleanup();
                    originalUnmount();
                };
            }
        },
    };
}
