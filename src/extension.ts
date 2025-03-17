import * as vscode from 'vscode';

const supportedLanguageIds = ['java'];
const supportedDiagnosticSources = ['Java'];

// called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    // Listen for changes in diagnostics
    context.subscriptions.push(
        vscode.languages.onDidChangeDiagnostics(async (event) => {
            const activeEditor = vscode.window.activeTextEditor;
            const languageId = activeEditor?.document.languageId || '';
            if (!activeEditor || !supportedLanguageIds.includes(languageId)) {
                return;
            }

            // Check if any of the changed URIs match the active editor
            const activeDocUri = activeEditor.document.uri;
            if (
                !event.uris.some(
                    (uri) => uri.toString() === activeDocUri.toString()
                )
            ) {
                return;
            }

            const diagnostics = vscode.languages.getDiagnostics(activeDocUri);

            const errors = diagnostics.filter(
                (d) =>
                    d.severity === vscode.DiagnosticSeverity.Error &&
                    d.source &&
                    supportedDiagnosticSources.includes(d.source)
            );
            const allMissingSemicolonErrors = errors.every(
                isMissingSemicolonError
            );

            if (allMissingSemicolonErrors && errors.length > 0) {
                for (const diagnostic of errors) {
                    await applyFix(activeDocUri, diagnostic);
                }
            }
        })
    );
}
export function deactivate() {
    // No additional cleanup needed as subscriptions are managed by the extension context
}

function isMissingSemicolonError(diagnostic: vscode.Diagnostic): boolean {
    const missingSemicolonJava =
        diagnostic.severity === vscode.DiagnosticSeverity.Error &&
        diagnostic.source === 'Java' &&
        diagnostic.message.startsWith(`Syntax error, insert ";" to complete `);

    return missingSemicolonJava;
}

//TODO avoid messing with the user entering ; themselves
function applyFix(
    activeDocUri: vscode.Uri,
    diagnostic: vscode.Diagnostic
): Thenable<boolean> {
    const insertPosition = diagnostic.range.end;
    const edit = new vscode.WorkspaceEdit();
    const document = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.toString() === activeDocUri.toString()
    );
    if (document) {
        // check one character before and after the insert position to avoid inserting semicolon twice
        const textAtPosition = document.getText(
            new vscode.Range(
                insertPosition.translate(0, -1),
                insertPosition.translate(0, 1)
            )
        );
        if (!textAtPosition.includes(';')) {
            edit.insert(activeDocUri, insertPosition, ';');
        }
    }
    return vscode.workspace.applyEdit(edit);
}
