import type {JsonValue} from '@croct/plug/sdk/json';
import type {EvaluationOptions} from '@croct/sdk/facade/evaluatorFacade';
import type {MaybeRefOrGetter} from 'vue';
import {ref, shallowRef, toValue, watch} from 'vue';
import type {LoaderResult} from './useLoader';
import {useLoader} from './useLoader';
import {useCroct} from './useCroct';
import {isSsr} from '../ssr-polyfills';
import {hash} from '../hash';

export type UseEvaluationOptions<I, F> = EvaluationOptions & {
    initial?: I,
    fallback?: F,
    cacheKey?: string,
    expiration?: number,
    staleWhileLoading?: boolean,
};

type UseEvaluationHook = <T extends JsonValue, I = T, F = T>(
    query: MaybeRefOrGetter<string>,
    options?: MaybeRefOrGetter<UseEvaluationOptions<I, F>>,
) => LoaderResult<T | I | F>;

function cleanEvaluationOptions(options: EvaluationOptions): EvaluationOptions {
    const result: EvaluationOptions = {};

    for (const [key, value] of Object.entries(options) as Array<[keyof EvaluationOptions, any]>) {
        if (value !== undefined) {
            result[key] = value;
        }
    }

    return result;
}

export const useEvaluation = (<T extends JsonValue = JsonValue, I = T, F = T>(
    query: MaybeRefOrGetter<string>,
    options: MaybeRefOrGetter<UseEvaluationOptions<I, F>> = {},
): LoaderResult<T | I | F> => {
    const resolvedOptions = toValue(options);

    if (isSsr()) {
        if (resolvedOptions.initial === undefined) {
            throw new Error(
                'The initial value is required for server-side rendering (SSR). '
                + 'For help, see https://croct.help/sdk/vue/missing-evaluation-result',
            );
        }

        return {
            data: shallowRef(resolvedOptions.initial),
            isLoading: ref(false),
            error: ref(null),
        };
    }

    const croct = useCroct();

    const initial = ref<T | I | F | undefined>(resolvedOptions.initial);

    const result = useLoader<T | I | F>(
        () => {
            const currentQuery = toValue(query);
            const currentOptions = toValue(options);
            const {
                cacheKey,
                fallback,
                expiration,
                initial: initialValue,
                staleWhileLoading: _,
                ...evaluationOptions
            } = currentOptions;

            return {
                cacheKey: hash(
                    `useEvaluation:${cacheKey ?? ''}`
                    + `:${currentQuery}`
                    + `:${JSON.stringify(currentOptions.attributes ?? {})}`,
                ),
                loader: () => croct.evaluate<T & JsonValue>(
                    currentQuery,
                    cleanEvaluationOptions(evaluationOptions),
                ),
                initial: initial.value,
                fallback: fallback,
                expiration: expiration,
            };
        },
    );

    if (resolvedOptions.staleWhileLoading === true) {
        watch(
            () => result.data.value,
            newValue => {
                if (newValue !== undefined && newValue !== initial.value) {
                    initial.value = newValue;
                }
            },
        );
    }

    return result;
}) as UseEvaluationHook;
