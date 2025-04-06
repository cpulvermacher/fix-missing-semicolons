import assert from 'assert';
import { mkdtempSync } from 'fs';
import { afterEach, before, beforeEach, suite, test } from 'mocha';
import { tmpdir } from 'os';
import * as vscode from 'vscode';

suite('Extension ', () => {
    let tempDir: string;

    before(async () => {
        // redhat is not a trusted publisher, so add it to the whitelist first
        const config = vscode.workspace.getConfiguration();
        await config.update(
            'extensions.allowed',
            { 'redhat.java': true },
            vscode.ConfigurationTarget.Global
        );

        // install java
        await vscode.commands.executeCommand(
            'workbench.extensions.installExtension',
            'redhat.java'
        );
        console.log(`redhat.java installed successfully.`);
    });

    beforeEach(async () => {
        tempDir = mkdtempSync(tmpdir() + '/vscode-test-');

        //set default config values
        await setConfig({ fixOnSave: true });
    });

    afterEach(async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            await vscode.commands.executeCommand(
                'workbench.action.closeActiveEditor'
            );
        }

        await vscode.workspace.fs.delete(vscode.Uri.file(tempDir), {
            recursive: true,
        });
    });

    /** need to save code to trigger full syntax check */
    async function writeTestFile(content: string) {
        const className = content.match(/public class (\w+)/)?.[1] || 'Unknown';
        const testFileUri = vscode.Uri.file(tempDir + `/${className}.java`);
        console.log(`Writing test file to ${testFileUri.fsPath}...`);

        await vscode.workspace.fs.writeFile(testFileUri, Buffer.from(content));
        return testFileUri;
    }

    async function waitForDiagnostics(testFileUri: vscode.Uri) {
        await new Promise<void>((resolve, reject) => {
            const disposable = vscode.languages.onDidChangeDiagnostics((e) => {
                if (
                    e.uris.some(
                        (uri) => uri.toString() === testFileUri.toString()
                    )
                ) {
                    const diagnostics =
                        vscode.languages.getDiagnostics(testFileUri);
                    if (diagnostics.length > 0) {
                        console.log(
                            `Found ${diagnostics.length} diagnostics`,
                            diagnostics
                        );
                        disposable.dispose();
                        resolve();
                    }
                }
            });

            // Set a timeout as a fallback
            setTimeout(() => {
                disposable.dispose();
                reject(new Error('Timed out waiting for diagnostics'));
            }, 18000);
        });
    }

    test('inserts missing semicolon on command', async () => {
        await setConfig({ fixOnSave: false });

        const javaCode = getJavaCode('CommandTest');
        const codeWithMissingSemicolon = javaCode.replace(';', '');
        const testFileUri = await writeTestFile(codeWithMissingSemicolon);

        await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(testFileUri)
        );
        await waitForDiagnostics(testFileUri);

        await vscode.commands.executeCommand('fix-missing-semicolons.fix');

        await waitFor(() => {
            assert.strictEqual(
                vscode.window.activeTextEditor?.document.getText(),
                javaCode
            );
        });
    });

    test('fixOnSave: inserts missing semicolon in java code', async () => {
        await setConfig({ fixOnSave: true });

        const javaCode = getJavaCode('OnSaveTest');
        const codeWithMissingSemicolon = javaCode.replace(';', '');
        const testFileUri = await writeTestFile(codeWithMissingSemicolon);

        await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(testFileUri)
        );

        await waitForDiagnostics(testFileUri);

        await waitFor(
            () => {
                vscode.commands.executeCommand('workbench.action.files.save');
                const actualCode =
                    vscode.window.activeTextEditor?.document.getText();
                assert.strictEqual(actualCode, javaCode);
            },
            15_000,
            500
        );

        //check the file was saved with the fix applied (i.e. no unsaved changes)
        await waitFor(() => {
            assert.strictEqual(
                vscode.window.activeTextEditor?.document.isDirty,
                false,
                'Document should not be dirty after saving'
            );
        });
    });

    test('does not insert missing semicolon if other syntax errors exist', async () => {
        await setConfig({ fixOnSave: true });
        const javaCode = getJavaCode('OtherSyntaxErrorTest');
        const codeWithSyntaxError = javaCode
            .replace(';', '')
            .replace('public class', 'pb class');
        const testFileUri = await writeTestFile(codeWithSyntaxError);

        await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(testFileUri)
        );
        await waitForDiagnostics(testFileUri);

        await sleep(1000); // wait for extension to process diagnostics (so we can check it really doesn't apply any fix)

        const actualCode = vscode.window.activeTextEditor?.document.getText();
        assert.strictEqual(actualCode, codeWithSyntaxError);
    });

    test('does not add semicolon if text fixed in the mean time', async () => {
        await setConfig({ fixOnSave: false });

        const javaCode = getJavaCode('AlreadyFixedTest').replace(
            ';',
            '; //test'
        );
        const codeWithMissingSemicolon = javaCode.replace(';', '');
        const testFileUri = await writeTestFile(codeWithMissingSemicolon);

        await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(testFileUri)
        );
        await waitForDiagnostics(testFileUri);

        // adjust code in mean time
        const editor = vscode.window.activeTextEditor!;
        const insertPosition = getPositionOf(' //test', editor.document);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(editor.document.uri, insertPosition, ';');
        await vscode.workspace.applyEdit(edit);

        await vscode.commands.executeCommand('fix-missing-semicolons.fix');

        await sleep(1000); // wait for extension to process diagnostics (so we can check it really doesn't apply any fix)

        await waitFor(() => {
            assert.strictEqual(
                vscode.window.activeTextEditor?.document.getText(),
                javaCode
            );
        });
    });
});

async function setConfig(settings: { fixOnSave: boolean }) {
    const config = vscode.workspace.getConfiguration('fix-missing-semicolons');

    for (const [key, value] of Object.entries(settings)) {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
    }
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(
    condition: () => void,
    timeoutMs: number = 5_000,
    intervalMs: number = 100
): Promise<void> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkCondition = () => {
            const elapsedMs = Date.now() - startTime;
            try {
                condition();
                if (elapsedMs > intervalMs) {
                    console.log(`waitFor succeeded after ${elapsedMs}ms`);
                }
                resolve();
            } catch (e) {
                if (elapsedMs > timeoutMs) {
                    const msg = e instanceof Error ? e.message : String(e);
                    reject(
                        new Error(
                            `waitFor timed out after ${timeoutMs}ms: ${msg}`
                        )
                    );
                } else {
                    setTimeout(checkCondition, intervalMs);
                }
            }
        };

        checkCondition();
    });
}

function getJavaCode(className: string) {
    return `public class ${className} {
    public static void main(String[] args) {
        System.out.println("Hello, world!");
    }
}`;
}

/** find first occurrence of text in document */
function getPositionOf(text: string, document: vscode.TextDocument) {
    const index = document.getText().indexOf(text);
    if (index === -1) {
        throw new Error(`Text "${text}" not found in document`);
    }
    return document.positionAt(index);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function skip(title: string, fn: () => void | Promise<void>) {
    void fn;

    console.log(`Skipping test: ${title}`);
}
