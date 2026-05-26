import type {PropType, VNode} from 'vue';
import {defineComponent} from 'vue';
import type {VersionedSlotId} from '@croct/plug/slot';
import type {JsonObject} from '@croct/plug/sdk/json';
import {useContent} from '../../composables/useContent';

export const Slot = defineComponent({
    name: 'Slot',
    props: {
        id: {
            type: String as PropType<VersionedSlotId>,
            required: true,
        },
        initial: {
            type: [Object, String, Number, Boolean, null] as PropType<any>,
            default: undefined,
        },
        fallback: {
            type: [Object, String, Number, Boolean, null] as PropType<any>,
            default: undefined,
        },
        cacheKey: {
            type: String,
            default: undefined,
        },
        expiration: {
            type: Number,
            default: undefined,
        },
        preferredLocale: {
            type: String,
            default: undefined,
        },
        attributes: {
            type: Object as PropType<JsonObject>,
            default: undefined,
        },
    },
    setup: function (props, {slots}) {
        const {data, metadata, error} = useContent(props.id, {
            ...(props.initial !== undefined ? {initial: props.initial} : {}),
            ...(props.fallback !== undefined ? {fallback: props.fallback} : {}),
            ...(props.cacheKey !== undefined ? {cacheKey: props.cacheKey} : {}),
            ...(props.expiration !== undefined ? {expiration: props.expiration} : {}),
            ...(props.preferredLocale !== undefined ? {preferredLocale: props.preferredLocale} : {}),
            ...(props.attributes !== undefined ? {attributes: props.attributes} : {}),
        });

        return (): VNode | VNode[] | undefined => {
            if (data.value !== undefined) {
                return slots.default?.({
                    content: data.value,
                    ...(metadata.value !== undefined ? {metadata: metadata.value} : {}),
                });
            }

            if (error.value !== null) {
                return slots.error?.({error: error.value});
            }

            return slots.loading?.();
        };
    },
});
