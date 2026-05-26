import type {DynamicSlotId, SlotContent, VersionedSlotId, VersionedSlotMap} from '@croct/plug/slot';
import type {JsonObject} from '@croct/plug/sdk/json';
import type {FetchOptions} from '@croct/plug/plug';
import type {FetchResponseOptions, SlotMetadata} from '@croct/sdk/contentFetcher';
import type {MaybeRefOrGetter, Ref, ShallowRef} from 'vue';
import {ref, shallowRef, toValue, watch} from 'vue';
import {getSlotContent} from '@croct/content';
import {useLoader} from './useLoader';
import {useCroct} from './useCroct';
import {isSsr} from '../ssr-polyfills';
import {hash} from '../hash';

export type UseContentOptions<I, F> = FetchOptions<F> & {
    initial?: I,
    cacheKey?: string,
    expiration?: number,
    staleWhileLoading?: boolean,
};

export type ContentMetadata = SlotMetadata;

export type UseContentResult<P> = {
    data: ShallowRef<P | undefined>,
    metadata: ShallowRef<ContentMetadata | undefined>,
    isLoading: Ref<boolean>,
    error: Ref<Error | null>,
};

type ContentResponse = {
    content: any,
    metadata?: ContentMetadata,
};

function normalizePreferredLocale(preferredLocale: string | undefined): string | undefined {
    return preferredLocale !== undefined && preferredLocale !== '' ? preferredLocale : undefined;
}

type UseContentHook = {
    <P extends JsonObject, I = P, F = P, O extends FetchResponseOptions = FetchResponseOptions>(
        id: MaybeRefOrGetter<keyof VersionedSlotMap extends never ? string : never>,
        options?: MaybeRefOrGetter<O & UseContentOptions<I, F>>
    ): UseContentResult<P | I | F>,

    <S extends VersionedSlotId, O extends FetchResponseOptions = FetchResponseOptions>(
        id: MaybeRefOrGetter<S>,
        options?: MaybeRefOrGetter<O & UseContentOptions<never, never>>
    ): UseContentResult<SlotContent<S>>,

    <I, S extends VersionedSlotId, O extends FetchResponseOptions = FetchResponseOptions>(
        id: MaybeRefOrGetter<S>,
        options?: MaybeRefOrGetter<O & UseContentOptions<I, never>>
    ): UseContentResult<SlotContent<S> | I>,

    <F, S extends VersionedSlotId, O extends FetchResponseOptions = FetchResponseOptions>(
        id: MaybeRefOrGetter<S>,
        options?: MaybeRefOrGetter<O & UseContentOptions<never, F>>
    ): UseContentResult<SlotContent<S> | F>,

    <I, F, S extends VersionedSlotId, O extends FetchResponseOptions = FetchResponseOptions>(
        id: MaybeRefOrGetter<S>,
        options?: MaybeRefOrGetter<O & UseContentOptions<I, F>>
    ): UseContentResult<SlotContent<S> | I | F>,
};

export const useContent: UseContentHook = (
    id: MaybeRefOrGetter<VersionedSlotId>,
    options: MaybeRefOrGetter<UseContentOptions<any, any>> = {},
): UseContentResult<any> => {
    const resolvedOptions = toValue(options);
    const resolvedId = toValue(id);

    if (isSsr()) {
        const normalizedLocale = normalizePreferredLocale(resolvedOptions.preferredLocale);
        const resolvedInitialContent = resolvedOptions.initial === undefined
            ? getSlotContent(resolvedId, normalizedLocale) ?? undefined
            : resolvedOptions.initial;

        if (resolvedInitialContent === undefined) {
            throw new Error(
                'The initial content is required for server-side rendering (SSR). '
                + 'For help, see https://croct.help/sdk/vue/missing-slot-content',
            );
        }

        return {
            data: shallowRef(resolvedInitialContent),
            metadata: shallowRef(undefined),
            isLoading: ref(false),
            error: ref(null),
        };
    }

    const initialValue = resolvedOptions.initial === undefined
        ? getSlotContent(resolvedId, normalizePreferredLocale(resolvedOptions.preferredLocale)) ?? undefined
        : resolvedOptions.initial;

    const data = shallowRef(initialValue);
    const metadata = shallowRef<ContentMetadata | undefined>(undefined);
    const isLoading = ref(data.value === undefined);
    const error = ref<Error | null>(null);

    const initial = ref(initialValue);

    const croct = useCroct();

    const loader = useLoader<ContentResponse>(
        () => {
            const currentId = toValue(id);
            const currentOptions = toValue(options);
            const {
                cacheKey,
                expiration,
                fallback: fallbackContent,
                initial: _,
                staleWhileLoading: __,
                preferredLocale,
                ...fetchOptions
            } = currentOptions;

            const normalizedLocale = normalizePreferredLocale(preferredLocale);
            const defaultContent = getSlotContent(currentId, normalizedLocale) ?? undefined;
            const fallback = fallbackContent === undefined ? defaultContent : fallbackContent;

            return {
                cacheKey: hash(
                    `useContent:${cacheKey ?? ''}`
                    + `:${currentId}`
                    + `:${normalizedLocale ?? ''}`
                    + `:${JSON.stringify(fetchOptions?.attributes ?? {})}`,
                ),
                loader: () => croct.fetch<DynamicSlotId, FetchResponseOptions>(currentId, {
                    ...fetchOptions,
                    ...(normalizedLocale !== undefined ? {preferredLocale: normalizedLocale} : {}),
                    ...(fallback !== undefined ? {fallback: fallback} : {}),
                }),
                initial: initial.value !== undefined
                    ? {content: initial.value}
                    : undefined,
                expiration: expiration,
            };
        },
    );

    watch(
        () => loader.data.value,
        response => {
            if (response !== undefined) {
                data.value = response.content;
                metadata.value = response.metadata;
            } else {
                data.value = undefined;
                metadata.value = undefined;
            }
        },
        {immediate: true},
    );

    watch(() => loader.isLoading.value, value => { isLoading.value = value; }, {immediate: true});
    watch(() => loader.error.value, value => { error.value = value; }, {immediate: true});

    if (resolvedOptions.staleWhileLoading === true) {
        watch(
            () => data.value,
            newValue => {
                if (newValue !== undefined) {
                    initial.value = newValue;
                }
            },
        );
    }

    return {
        data: data,
        metadata: metadata,
        isLoading: isLoading,
        error: error,
    };
};
