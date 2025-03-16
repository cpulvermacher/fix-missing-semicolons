import * as vscode from 'vscode';

const supportedLanguageIds = ['java'];
const supportedDiagnosticSources = ['Java'];

// called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    // Listen for changes in diagnostics
    context.subscriptions.push(
        vscode.languages.onDidChangeDiagnostics((event) => {
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
                    applyFix(activeDocUri, diagnostic);
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
    const edit = new vscode.WorkspaceEdit();
    edit.insert(activeDocUri, diagnostic.range.end, ';');
    return vscode.workspace.applyEdit(edit);
}
