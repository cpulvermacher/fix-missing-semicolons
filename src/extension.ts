import * as vscode from 'vscode';

const supportedLanguageIds = ['java'];
const supportedDiagnosticSources = ['Java'];

let diagnosticListener: vscode.Disposable | undefined;
let saveListener: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
    const { fixOnError, fixOnSave } = getConfig();

    if (fixOnError) {
        diagnosticListener = vscode.languages.onDidChangeDiagnostics(
            handleDiagnosticUpdates
        );
        context.subscriptions.push(diagnosticListener);
    }
    if (fixOnSave) {
        saveListener =
            vscode.workspace.onWillSaveTextDocument(handleDocumentSave);
        context.subscriptions.push(saveListener);
    }

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(handleConfigChange)
    );
}

export function deactivate() {
    // No additional cleanup needed as subscriptions are managed by the extension context
}

function getConfig() {
    const config = vscode.workspace.getConfiguration('fix-missing-semicolons');
    const fixOnError = config.get<boolean>('fixOnError') ?? false;
    const fixOnSave = config.get<boolean>('fixOnSave') ?? true;
    return { fixOnError, fixOnSave };
}

function handleConfigChange(e: vscode.ConfigurationChangeEvent) {
    if (!e.affectsConfiguration('fix-missing-semicolons')) {
        return;
    }

    const { fixOnError, fixOnSave } = getConfig();
    if (fixOnError && !diagnosticListener) {
        diagnosticListener = vscode.languages.onDidChangeDiagnostics(
            handleDiagnosticUpdates
        );
    } else if (!fixOnError && diagnosticListener) {
        diagnosticListener.dispose();
        diagnosticListener = undefined;
    }

    if (fixOnSave && !saveListener) {
        saveListener =
            vscode.workspace.onWillSaveTextDocument(handleDocumentSave);
    } else if (!fixOnSave && saveListener) {
        saveListener.dispose();
        saveListener = undefined;
    }
}

async function handleDiagnosticUpdates(
    event: vscode.DiagnosticChangeEvent
): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    const languageId = activeEditor?.document.languageId || '';
    if (!activeEditor || !supportedLanguageIds.includes(languageId)) {
        return;
    }

    // Check if any of the changed URIs match the active editor
    const activeDocUri = activeEditor.document.uri;
    if (!event.uris.some((uri) => uri.toString() === activeDocUri.toString())) {
        return;
    }

    await checkAndFixDocument(activeEditor, true);
}

async function handleDocumentSave(e: vscode.TextDocumentWillSaveEvent) {
    const activeEditor = vscode.window.activeTextEditor;
    if (
        !activeEditor ||
        !supportedLanguageIds.includes(e.document.languageId)
    ) {
        return;
    }
    await checkAndFixDocument(activeEditor, false);
}

function isMissingSemicolonError(diagnostic: vscode.Diagnostic): boolean {
    const missingSemicolonJava =
        diagnostic.severity === vscode.DiagnosticSeverity.Error &&
        diagnostic.source === 'Java' &&
        diagnostic.message.startsWith(`Syntax error, insert ";" to complete `);

    return missingSemicolonJava;
}

async function checkAndFixDocument(
    editor: vscode.TextEditor,
    avoidCursor: boolean
) {
    const activeDocUri = editor.document.uri;
    const diagnostics = vscode.languages.getDiagnostics(activeDocUri);

    const errors = diagnostics.filter(
        (d) =>
            d.severity === vscode.DiagnosticSeverity.Error &&
            d.source &&
            supportedDiagnosticSources.includes(d.source)
    );
    const allMissingSemicolonErrors = errors.every(isMissingSemicolonError);

    if (allMissingSemicolonErrors && errors.length > 0) {
        for (const diagnostic of errors) {
            const insertPosition = diagnostic.range.end;
            if (
                hasSemicolon(editor.document, insertPosition) ||
                (avoidCursor && isNearCursor(editor, insertPosition))
            ) {
                continue;
            }

            await applyFix(activeDocUri, insertPosition);
        }
    }
}

function applyFix(
    activeDocUri: vscode.Uri,
    insertPosition: vscode.Position
): Thenable<boolean> {
    const edit = new vscode.WorkspaceEdit();
    edit.insert(activeDocUri, insertPosition, ';');
    return vscode.workspace.applyEdit(edit);
}

function hasSemicolon(
    document: vscode.TextDocument,
    position: vscode.Position
) {
    // check one character before and after the insert position to avoid inserting semicolon twice
    const textAtPosition = document.getText(
        new vscode.Range(position.translate(0, -1), position.translate(0, 1))
    );
    return textAtPosition.includes(';');
}

/** returns true if cursor is in current or next line.
 * This helps avoid close statements
 * like
 * ```
 * someList
 *   .stream()
 * ```
 */
function isNearCursor(editor: vscode.TextEditor, position: vscode.Position) {
    const cursorLine = editor.selection.active.line;
    return cursorLine === position.line || cursorLine === position.line + 1;
}
