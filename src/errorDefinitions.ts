import type { Diagnostic } from 'vscode';

// This file contains the definitions for the errors that the extension can fix.
export const targetErrors = [
    {
        message: 'Syntax error, insert ";" to complete',
        languageId: 'java',
        source: 'Java',
    },
];

export const isTargetError = (diagnostic: Diagnostic) => {
    return targetErrors.some(
        (e) =>
            diagnostic.source === e.source &&
            diagnostic.message.startsWith(e.message)
    );
};
