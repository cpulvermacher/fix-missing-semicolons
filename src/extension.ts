import * as vscode from 'vscode';

import { isTargetError, targetErrors } from './errorDefinitions';

const supportedLanguageIds = targetErrors.map((error) => error.languageId);
const supportedDiagnosticSources = targetErrors.map((error) => error.source);

let saveListener: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'fix-missing-semicolons.fix',
            onFixCommand
        )
    );

    updateConfig();

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('fix-missing-semicolons')) {
                updateConfig();
            }
        })
    );
}

export function deactivate() {
    // listeners are not added to context.subscriptions
    if (saveListener) {
        saveListener.dispose();
    }
}

function getConfig() {
    const config = vscode.workspace.getConfiguration('fix-missing-semicolons');
    const fixOnSave = config.get<boolean>('fixOnSave') ?? true;
    return { fixOnSave };
}

function updateConfig() {
    const { fixOnSave } = getConfig();

    if (fixOnSave && !saveListener) {
        saveListener = vscode.workspace.onWillSaveTextDocument(onWillSaveEvent);
    } else if (!fixOnSave && saveListener) {
        saveListener.dispose();
        saveListener = undefined;
    }
}

/** returns document if it contains a target language */
function getTargetDocument(document: vscode.TextDocument | undefined) {
    const languageId = document?.languageId || '';
    if (!document || !supportedLanguageIds.includes(languageId)) {
        return null;
    }
    return document;
}

async function onFixCommand() {
    const document = vscode.window.activeTextEditor?.document;
    const targetDocument = getTargetDocument(document);
    if (targetDocument) {
        await checkAndFixDocument(targetDocument);
    }
}

async function onWillSaveEvent(event: vscode.TextDocumentWillSaveEvent) {
    const targetDocument = getTargetDocument(event.document);
    if (targetDocument) {
        await checkAndFixDocument(targetDocument);
    }
}

async function checkAndFixDocument(document: vscode.TextDocument) {
    const activeDocUri = document.uri;
    const diagnostics = vscode.languages.getDiagnostics(activeDocUri);

    const errors = diagnostics.filter(
        (d) =>
            d.severity === vscode.DiagnosticSeverity.Error &&
            d.source &&
            supportedDiagnosticSources.includes(d.source)
    );
    if (!errors.every(isTargetError) || errors.length === 0) {
        return;
    }

    for (const diagnostic of errors) {
        const insertPosition = diagnostic.range.end;
        if (hasSemicolon(document, insertPosition)) {
            continue;
        }

        await applyFix(activeDocUri, insertPosition);
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
