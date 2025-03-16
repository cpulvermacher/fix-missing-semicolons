import assert from 'assert';
import { mkdtempSync } from 'fs';
import { after, before, suite, test } from 'mocha';
import { tmpdir } from 'os';
import * as vscode from 'vscode';

const javaCode = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, world!");
    }
}`;

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

        tempDir = mkdtempSync(tmpdir() + '/vscode-test-');
    });

    after(async () => {
        await vscode.workspace.fs.delete(vscode.Uri.file(tempDir), {
            recursive: true,
        });
    });

    /** need to save code to trigger full syntax check */
    async function writeTestFile(content: string) {
        const randomSuffix = Math.random().toString(36).substring(5);
        const testFileUri = vscode.Uri.file(
            tempDir + `/test${randomSuffix}.java`
        );
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
                        console.log(`Found ${diagnostics.length} diagnostics`);
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

        // Now wait a bit to ensure extension has processed the diagnostics
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    test('inserts missing semicolon in java code', async () => {
        const codeWithMissingSemicolon = javaCode.replace(';', '');

        const testFileUri = await writeTestFile(codeWithMissingSemicolon);

        await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(testFileUri)
        );
        await waitForDiagnostics(testFileUri);

        const actualCode = vscode.window.activeTextEditor?.document.getText();
        assert.strictEqual(actualCode, javaCode);
    });

    test('does not insert missing semicolon if other syntax errors exist', async () => {
        const codeWithSyntaxError = javaCode
            .replace(';', '')
            .replace('public class', 'pb class');
        const testFileUri = await writeTestFile(codeWithSyntaxError);

        await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(testFileUri)
        );
        await waitForDiagnostics(testFileUri);

        const actualCode = vscode.window.activeTextEditor?.document.getText();
        assert.strictEqual(actualCode, codeWithSyntaxError);
    });
});
