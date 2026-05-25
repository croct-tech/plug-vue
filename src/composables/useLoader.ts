import type {Ref, ShallowRef} from 'vue';
import {onUnmounted, ref, shallowRef, watch} from 'vue';
import type {EntryOptions} from './Cache';
import {Cache} from './Cache';

const cache = new Cache(60 * 1000);

export type CacheOptions<R> = EntryOptions<R> & {
    initial?: R,
    fallback?: R,
};

export type LoaderResult<R> = {
    data: ShallowRef<R | undefined>,
    isLoading: Ref<boolean>,
    error: Ref<Error | null>,
};

/**
 * @internal
 */
export function useLoader<R>(optionsGetter: () => CacheOptions<R>): LoaderResult<R> {
    const options = optionsGetter();
    const data = shallowRef<R | undefined>(cache.get<R>(options.cacheKey)?.result ?? options.initial);
    const isLoading = ref(data.value === undefined);
    const error = ref<Error | null>(null);
    let mounted = true;

    function load(opts: CacheOptions<R>): void {
        const entry = cache.fetch(opts);

        if (entry.result !== undefined) {
            data.value = entry.result;
            isLoading.value = false;

            return;
        }

        if (entry.error !== undefined) {
            error.value = entry.error instanceof Error ? entry.error : new Error(String(entry.error));

            if (opts.fallback !== undefined) {
                data.value = opts.fallback;
            }

            isLoading.value = false;

            return;
        }

        isLoading.value = true;

        entry.promise
            .then((result: R) => {
                if (mounted) {
                    data.value = result;
                    isLoading.value = false;
                }
            })
            .catch((thrown: unknown) => {
                if (mounted) {
                    error.value = thrown instanceof Error ? thrown : new Error(String(thrown));

                    if (opts.fallback !== undefined) {
                        data.value = opts.fallback;
                    }

                    isLoading.value = false;
                }
            });
    }

    load(options);

    onUnmounted(() => {
        mounted = false;
    });

    watch(
        () => optionsGetter().cacheKey,
        () => {
            const currentOptions = optionsGetter();

            data.value = currentOptions.initial;
            error.value = null;
            isLoading.value = data.value === undefined;

            load(currentOptions);
        },
    );

    return {
        data: data,
        isLoading: isLoading,
        error: error,
    };
}
