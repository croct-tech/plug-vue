import {join as pathJoin} from 'path';
import {create} from 'ts-node';

const tsService = create({
    cwd: pathJoin(__dirname, '..', '..'),
    transpileOnly: false,
});

const testFilename = pathJoin(__dirname, 'test.ts');

describe('useContent typing', () => {
    const header = `
        import {useContent} from './useContent';
    `;

    const slotMapping = `
        type HomeBanner = {
            title: string,
            subtitle: string,
        };

        type Banner = {
            title: string,
            subtitle: string,
        };

        type Carousel = {
            title: string,
            subtitle: string,
        };

        declare module '@croct/plug/slot' {
            type HomeBannerV1 = HomeBanner & {_component: 'banner@v1' | null};

            interface VersionedSlotMap {
                'home-banner': {
                    'latest': HomeBannerV1,
                    '1': HomeBannerV1,
                };
            }
        }

        declare module '@croct/plug/component' {
            interface VersionedComponentMap {
                'banner': {
                    'latest': Banner,
                    '1': Banner,
                };
                'carousel': {
                    'latest': Carousel,
                    '1': Carousel,
                };
            }
        }
    `;

    type CodeOptions = {
        code: string,
        mapping: boolean,
    };

    type AssembledCode = {
        code: string,
        codePosition: number,
    };

    function assembleCode(options: CodeOptions): AssembledCode {
        const prefix = options.mapping
            ? header + slotMapping
            : header;

        return {
            code: prefix + options.code.trim(),
            codePosition: prefix.length + 1,
        };
    }

    function compileCode(opts: CodeOptions): void {
        tsService.compile(assembleCode(opts).code, testFilename);
    }

    function getTypeName(opts: CodeOptions): string {
        const assembledCode = assembleCode(opts);

        const info = tsService.getTypeInfo(assembledCode.code, testFilename, assembledCode.codePosition);

        const match = info.name.match(/^\(alias\) (useContent<.+?>)/s);

        if (match !== null) {
            return match[1].replace(/\s*\n\s*/g, '');
        }

        return info.name;
    }

    it('should define the return type as a JSON object by default for unmapped slots', () => {
        const code: CodeOptions = {
            code: `
                useContent('home-banner');
            `,
            mapping: false,
        };

        expect(() => compileCode(code)).not.toThrow();

        expect(getTypeName(code)).toBe(
            'useContent<JsonObject, JsonObject, JsonObject, FetchResponseOptions>',
        );
    });

    it('should include the type of the initial value on the return type for unmapped slots', () => {
        const code: CodeOptions = {
            code: `
                useContent('home-banner', {initial: true});
            `,
            mapping: false,
        };

        expect(() => compileCode(code)).not.toThrow();

        expect(getTypeName(code)).toBe(
            'useContent<JsonObject, boolean, JsonObject, FetchResponseOptions>',
        );
    });

    it('should include the type of the fallback value on the return type for unmapped slots', () => {
        const code: CodeOptions = {
            code: `
                useContent('home-banner', {fallback: 1});
            `,
            mapping: false,
        };

        expect(() => compileCode(code)).not.toThrow();

        expect(getTypeName(code)).toBe(
            'useContent<JsonObject, JsonObject, number, FetchResponseOptions>',
        );
    });

    it('should allow narrowing the return type for unmapped slots', () => {
        const code: CodeOptions = {
            code: `
                useContent<{foo: string}>('home-banner');
            `,
            mapping: false,
        };

        expect(() => compileCode(code)).not.toThrow();

        expect(getTypeName(code)).toBe(
            'useContent<{foo: string;}, {foo: string;}, {foo: string;}, FetchResponseOptions>',
        );
    });

    it('should require specifying JSON object as return type for mapped slots', () => {
        const code: CodeOptions = {
            code: `
                useContent<true>('home-banner');
            `,
            mapping: false,
        };

        expect(() => compileCode(code)).toThrow();
    });

    it('should infer the return type for mapped slots', () => {
        const code: CodeOptions = {
            code: `
                useContent('home-banner');
            `,
            mapping: true,
        };

        expect(() => compileCode(code)).not.toThrow();

        expect(getTypeName(code)).toBe('useContent<"home-banner", FetchResponseOptions>');
    });

    it('should include the type of the initial value on the return type for mapped slots', () => {
        const code: CodeOptions = {
            code: `
                useContent('home-banner', {initial: true});
            `,
            mapping: true,
        };

        expect(() => compileCode(code)).not.toThrow();

        expect(getTypeName(code)).toBe('useContent<boolean, "home-banner", FetchResponseOptions>');
    });

    it('should not allow overriding the return type for mapped slots', () => {
        const code: CodeOptions = {
            code: `
                useContent<{title: string}>('home-banner');
            `,
            mapping: true,
        };

        expect(() => compileCode(code)).toThrow();
    });
});
