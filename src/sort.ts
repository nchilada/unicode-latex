export function hammingDistance(query: string, latexName: string): number {
    // Count the number of case-toggling "edits" needed to equate:
    // - the query string
    // - the substring of the LaTeX name beginning at `indexOfFirstCaseInsensitiveMatch`
    //
    // Note that the LaTeX name includes its leading "\",
    // which might be convenient for users who habitually type "\" directly into the picker as part of the query string,
    // especially if the user has not bound the `insertMathSymbol` command to a keybinding that happens to include a backslash.
    // (A backslash case-folds to itself, so it contributes neither a mismatch nor a phantom match either way, FWIW.)
    const indexOfFirstCaseInsensitiveMatch = latexName.toLowerCase().indexOf(query.toLowerCase());
    if (indexOfFirstCaseInsensitiveMatch < 0) {
        return Infinity;
    }

    let distance = 0;
    for (let i = 0; i < query.length; i++) {
        if (query[i] !== latexName[indexOfFirstCaseInsensitiveMatch + i]) {
            distance++;
        }
    }
    return distance;
}

export function sortedItemsForQuery(
    query: string,
    symbols: Record<string, string>
): Array<{ description: string; label: string }> {
    const canonicalQuery = query.toLowerCase();

    // Contiguous, case-insensitive substring search is what QuickPick itself uses for filtering
    // (see https://github.com/microsoft/vscode/blob/0ebc49192dd9e2004396003d7590cd6340daec04/src/vs/base/common/filters.ts#L67-L75).
    // Pre-filtering by the same criterion lets us dynamically _reorder_ those results based on
    // the casing of the user's query before handing the list back to QuickPick.
    const latexSymbolsByCanonicalForm = new Map<string, string[]>();
    for (const latexName in symbols) {
        const canonicalName = latexName.toLowerCase();
        if (!canonicalName.includes(canonicalQuery)) {
            continue;
        }

        let matchingLatexSymbols = latexSymbolsByCanonicalForm.get(canonicalName);
        if (!matchingLatexSymbols) {
            matchingLatexSymbols = [];
            latexSymbolsByCanonicalForm.set(canonicalName, matchingLatexSymbols);
        }
        matchingLatexSymbols.push(latexName);
    }

    const sortedItems: Array<{ description: string; label: string }> = [];
    // Walk between case-independent equivalence classes in the order in which their first entries appeared in `symbols`,
    // deliberately preserving (at least some of) that source ordering in the displayed list.
    // This relies on `Map.prototype.values()` iterating in insertion order, per EcmaScript spec,
    // and also relies on `for...in` iterating over a string-keyed object literal in insertion order, also per EcmaScript spec.
    for (const matchingLatexSymbols of latexSymbolsByCanonicalForm.values()) {
        // Decorate–sort–undecorate (computing each member's `hammingDistance` exactly once)
        // allows us to avoid the O(n log n) re-evaluations that a bare
        // ```
        //     (a, b) => hammingDistance(a, query) - hammingDistance(b, query)
        // ```
        // would otherwise incur.
        const sortedLatexSymbols = matchingLatexSymbols
            .map((latexName) => ({ latexName, distance: hammingDistance(query, latexName) }))
            .sort((a, b) => a.distance - b.distance);
        for (const { latexName } of sortedLatexSymbols) {
            sortedItems.push({ description: latexName, label: symbols[latexName] });
        }
    }

    return sortedItems;
}
