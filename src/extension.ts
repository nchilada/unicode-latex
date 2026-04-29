import * as vscode from 'vscode';
import {latexSymbols} from './latex';
import { LatexCompletionItemProvider } from './completion';
import { sortedItemsForQuery } from './sort';

const RE_LATEX_NAME = /(\\\S+)/g;

export function activate(context: vscode.ExtensionContext) {

    const insertion = vscode.commands.registerCommand('unicode-latex.insertMathSymbol', function showQuickPickForLatexSymbols() {
        /*
         * Similar to `vscode.window.showQuickPick`,
         * but in addition to filtering items (based on case-_insensitive_ substring search),
         * this also dynamically sorts the results based on how closely they case-_sensitively_ match the search query
         * rather than naively preserving the order in which items were provided when first opening the picker.
         * (Compared to LaTeX symbol names, other VS Code functionality that uses the picker
         * presumably doesn't have as strong a need for case-sensitivity.)
         * Note that the various case-independent equivalence classes, themselves,
         * are still arranged in the order in which their first entries appeared in `latex.ts`.
         */

        const quickPick = vscode.window.createQuickPick();
        quickPick.matchOnDescription = true;

        // Pre-populate the picker with some symbols visible even before the user starts typing a query,
        // thus matching the behavior of VS Code's file opener and command palette
        // (rather than starting with an empty dropdown menu).
        quickPick.items = sortedItemsForQuery('', latexSymbols);

        quickPick.onDidChangeValue((query: string) => {
            quickPick.items = sortedItemsForQuery(query, latexSymbols);
        });

        quickPick.onDidAccept(() => {
            const item = quickPick.selectedItems[0];
            quickPick.hide();
            insertSymbol(item);
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
        });

        quickPick.show();
    });

    let replacement = vscode.commands.registerCommand('unicode-latex.replaceLatexNames', () => {
        replaceWithUnicode(vscode.window.activeTextEditor);
    });

    const selector: vscode.DocumentSelector = vscode.workspace.getConfiguration("unicode-latex").extensions;
    const provider = new LatexCompletionItemProvider(latexSymbols);
    let completionSub = vscode.languages.registerCompletionItemProvider(selector, provider, '\\');

    context.subscriptions.push(insertion);
    context.subscriptions.push(replacement);
    context.subscriptions.push(completionSub);
}

function insertSymbol(item: vscode.QuickPickItem) {
    if (!item) { return; }
    let editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    editor.edit( (editBuilder) => {
        editBuilder.delete(editor.selection);
    }).then( () => {
        editor.edit( (editBuilder) => {
            editBuilder.insert(editor.selection.start, item.label);
        });
    });
}

function replaceWithUnicode(editor: vscode.TextEditor) {
    if (!editor) { return; }

    // If nothing is selected, select everything
    let selection = (() => {
        if (editor.selection.start.isBefore(editor.selection.end)) {
            return editor.selection;
        } else {
            let endLine = editor.document.lineAt(editor.document.lineCount - 1);
            return new vscode.Selection(
                new vscode.Position(0, 0),
                new vscode.Position(endLine.lineNumber, endLine.text.length)
            );
        }
    })();

    let text = editor.document.getText(selection);
    let replacement = text.replace(RE_LATEX_NAME, (m: string) => {
        if (latexSymbols.hasOwnProperty(m)) {
            return latexSymbols[m];
        }
        return m;
    });

    editor.edit((editBuilder) => {
        editBuilder.replace(selection, replacement);
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
