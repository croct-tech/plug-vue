import {defineConfig} from 'eslint/config';
import {configs} from '@croct/eslint-plugin';

export default defineConfig(
    configs.typescript,
    {
        rules: {
            '@typescript-eslint/no-redundant-type-constituents': 'off',
            '@typescript-eslint/only-throw-error': 'off',
            'import/no-default-export': 'off',
            'func-names': 'off',
        },
    },
    {
        files: [
            'jest.config.mjs',
        ],
        rules: {
            'import/no-default-export': 'off',
        },
    },
);
