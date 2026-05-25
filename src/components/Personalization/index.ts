import type {PropType, VNode} from 'vue';
import {defineComponent} from 'vue';
import type {JsonObject} from '@croct/plug/sdk/json';
import {useEvaluation} from '../../composables/useEvaluation';

export const Personalization = defineComponent({
    name: 'Personalization',
    props: {
        query: {
            type: String,
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
        timeout: {
            type: Number,
            default: undefined,
        },
        attributes: {
            type: Object as PropType<JsonObject>,
            default: undefined,
        },
    },
    setup: function (props, {slots}) {
        const {data, error} = useEvaluation(props.query, {
            ...(props.initial !== undefined ? {initial: props.initial} : {}),
            ...(props.fallback !== undefined ? {fallback: props.fallback} : {}),
            ...(props.cacheKey !== undefined ? {cacheKey: props.cacheKey} : {}),
            ...(props.expiration !== undefined ? {expiration: props.expiration} : {}),
            ...(props.timeout !== undefined ? {timeout: props.timeout} : {}),
            ...(props.attributes !== undefined ? {attributes: props.attributes} : {}),
        });

        return (): VNode | VNode[] | undefined => {
            if (data.value !== undefined) {
                return slots.default?.({result: data.value});
            }

            if (error.value !== null) {
                return slots.error?.({error: error.value});
            }

            return slots.loading?.();
        };
    },
});
