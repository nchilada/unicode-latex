/// <reference types="mocha" />
import * as assert from 'assert';
import { hammingDistance, sortedItemsForQuery } from '../src/sort';

const testSymbols: Record<string, string> = {
    // Given the following ordering of symbols, if searching for a substring like "omega", the
    // dropdown ought to show the "bfomega" equivalence class first, the "omega" class second,
    // and the "itomega" class third.

    // Two-symbol equivalence class.
    '\\bfOmega': '𝛀',
    '\\bfomega': '𝛚',

    // Two-symbol equivalence class.
    '\\Omega': 'Ω',
    '\\omega': 'ω',

    // Two-symbol equivalence class.
    '\\itOmega': '𝛺',
    '\\itomega': '𝜔',

    // Four-symbol equivalence class; Hamming-distance sorting is tested against this equivalence class.
    '\\vdash': '⊢',
    '\\vDash': '⊨',
    '\\Vdash': '⊩',
    '\\VDash': '⫫',

    // A symbol with no capitalised variant.
    '\\infty': '∞',
};

describe('hammingDistance', () => {

    it('supports non-letter characters', () => {
        assert.strictEqual(hammingDistance('\\1/2', '\\1/2'), 0);
    });

    it('counts the number of letter case mismatches', () => {
        assert.strictEqual(hammingDistance('BLAH', 'BLAH'), 0);
        assert.strictEqual(hammingDistance('blah', 'blah'), 0);
        assert.strictEqual(hammingDistance('bLah', 'blah'), 1);
        assert.strictEqual(hammingDistance('blah', 'bLah'), 1);
        assert.strictEqual(hammingDistance('blah', 'bLaH'), 2);
    });

    it('performs substring search', () => {
        assert.strictEqual(hammingDistance('omeg', '\\omega'), 0);
        // Supports leading backslashes, namely in LaTeX symbol names
        assert.strictEqual(hammingDistance('\\omeg', '\\omega'), 0);
        assert.strictEqual(hammingDistance('omeg', '\\itomega'), 0);
        assert.strictEqual(hammingDistance('\\omeg', '\\itomega'), Infinity);
    });

    it('returns Infinity in case the substring is invalid', () => {
        assert.strictEqual(hammingDistance('\\omeg', '\\itomega'), Infinity);
        assert.strictEqual(hammingDistance('blah', '\\omega'), Infinity);
        assert.strictEqual(hammingDistance('\\omega', 'omeg'), Infinity);
    });

    it('only compares with the (case-insensitively) _matching_ substring', () => {
        assert.strictEqual(hammingDistance('omeg', 'om omega'), 0);
        assert.strictEqual(hammingDistance('omeg', 'om Omega'), 1);
        assert.strictEqual(hammingDistance('Omeg', 'om omega'), 1);

        // The case differences in these examples don't count since they don't occur _in the relevant_ substring.
        assert.strictEqual(hammingDistance('omeg', 'Om om'), Infinity);
        assert.strictEqual(hammingDistance('omeg', 'Om omega'), 0);
    });
});

describe('sortedItemsForQuery', () => {
    it('returns a list of QuickPickItem objects', () => {
        assert.deepStrictEqual(
            sortedItemsForQuery('', { latexName: 'unicodeCharacter' }),
            [{
                description: 'latexName',
                label: 'unicodeCharacter',
            }]
        );
    });

    function descriptions(query: string): string[] {
        return sortedItemsForQuery(query, testSymbols).map((item) => item.description);
    }

    context('empty query', () => {
        it('returns all symbols', () => {
            assert.strictEqual(sortedItemsForQuery('', testSymbols).length, Object.keys(testSymbols).length);
        });
    });

    context('queries that match nothing', () => {
        it('returns no symbols', () => {
            assert.deepStrictEqual(descriptions('blah'), []);
        });
    });

    it('allows a leading backslash in the query string', () => {
        const result = descriptions('\\omeg');
        assert.ok(result.includes('\\omega'));
        assert.ok(result.includes('\\Omega'));
    });

    it('supports symbol names with no letter-case variants', () => {
        assert.deepStrictEqual(descriptions('infty'), ['\\infty']);
        assert.deepStrictEqual(descriptions('Infty'), ['\\infty']);
        assert.deepStrictEqual(descriptions('INFTY'), ['\\infty']);
    });

    it('sorts by case within each of the substring equivalence classes', () => {
        const lowercase = descriptions('omeg');
        assert.ok(lowercase.indexOf('\\omega') < lowercase.indexOf('\\Omega'));
        assert.ok(lowercase.indexOf('\\bfomega') < lowercase.indexOf('\\bfOmega'));
        assert.ok(lowercase.indexOf('\\itomega') < lowercase.indexOf('\\itOmega'));

        const capitalized = descriptions('Omeg');
        assert.ok(capitalized.indexOf('\\Omega') < capitalized.indexOf('\\omega'));
        assert.ok(capitalized.indexOf('\\bfOmega') < capitalized.indexOf('\\bfomega'));
        assert.ok(capitalized.indexOf('\\itOmega') < capitalized.indexOf('\\itomega'));
    });

    function assertIncreasing(...values: number[]) {
        assert.ok(values.every((v, i) => i === 0 || values[i - 1] < v));
    }

    it('preserves the original ordering of the various equivalence classes', () => {
        const lowercase = descriptions('omeg');
        assertIncreasing(
            lowercase.indexOf('\\bfOmega'),
            lowercase.indexOf('\\omega'),
            lowercase.indexOf('\\Omega'),
            lowercase.indexOf('\\itOmega'),
        );

        const capitalized = descriptions('Omeg');
        assertIncreasing(
            capitalized.indexOf('\\bfomega'),
            capitalized.indexOf('\\Omega'),
            capitalized.indexOf('\\omega'),
            capitalized.indexOf('\\itOmega'),
        );
    });

    it('sorts by hamming distance within large equivalence classes', () => {
        const lowerlower = descriptions('vd')
        assertIncreasing(
            lowerlower.indexOf('\\vdash'),
            lowerlower.indexOf('\\vDash'),
            lowerlower.indexOf('\\VDash'),
        );
        assertIncreasing(
            lowerlower.indexOf('\\vdash'),
            lowerlower.indexOf('\\Vdash'),
            lowerlower.indexOf('\\VDash'),
        );

        const upperupper = descriptions('VD')
        assertIncreasing(
            upperupper.indexOf('\\VDash'),
            upperupper.indexOf('\\vDash'),
            upperupper.indexOf('\\vdash'),
        );
        assertIncreasing(
            upperupper.indexOf('\\VDash'),
            upperupper.indexOf('\\Vdash'),
            upperupper.indexOf('\\vdash'),
        );
    });

    it('falls back to the original ordering to break ties within an equivalence class', () => {
        const result = descriptions('mega');
        assert.ok(result.includes('\\Omega'));
        assert.ok(result.includes('\\omega'));
        assert.ok(result.indexOf('\\Omega') < result.indexOf('\\omega'));

        // Perhaps we should have a hypothetical example of symbols wherein the lowercase version precedes the capitalized version in testSymbols,
        // but even what we're doing above may well be an overspecification...
    });
});
