// src/providers/SidebarProvider.ts
import * as vscode from 'vscode';
import { ProjectAnalyzer } from '../services';
import { ExtensionState } from '../state';
import { getNonce } from '../utils';
import { ProjectContext } from '../types';

export class SidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _state: ExtensionState,
        private readonly _projectAnalyzer: ProjectAnalyzer
    ) {}

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): Promise<void> {
        this._view = webviewView;

        // Set initial analyzing message before showing the webview
        webviewView.webview.html = this._getAnalyzingHtml(webviewView.webview);

        // Start project analysis immediately when view is resolved
        await this._handleInitialAnalysis();

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
    }

    private async _handleInitialAnalysis(): Promise<void> {
        if (!this._view) return;

        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace folder found');
            }

            const projectStructure = await this._projectAnalyzer.analyzeProject(workspaceRoot);
            
            console.log('Project Structure Analysis Results:');
            console.log('============================');
            this._logProjectStructure(projectStructure);

            this._state.setProjectStructure(projectStructure);

            await vscode.window.showInformationMessage('Project analysis completed successfully');
            
            // Update webview with main content
            this._view.webview.html = this._getMainHtml(this._view.webview, projectStructure);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';
            vscode.window.showErrorMessage(`Analysis failed: ${errorMessage}`);
            
            // Show error state in webview
            this._view.webview.html = this._getErrorHtml(this._view.webview, errorMessage);
        }
    }

    private _logProjectStructure(structure: ProjectContext): void {
        console.log('\nFiles:');
        structure.files.forEach((file: any) => {
            console.log(`- ${file.path} (${file.extension})`);
        });

        console.log('\nDependencies:');
        Object.entries(structure.packageDetails.mainDependencies).forEach(([name, version]) => {
            console.log(`- ${name}: ${version}`);
        });

        console.log('\nRoot Path:', structure.entryPoints);
        console.log('============================\n');
    }

    private _getAnalyzingHtml(webview: vscode.Webview): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Project Analyzer</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .analyzing-container {
                        text-align: center;
                    }
                    .spinner {
                        width: 30px;
                        height: 30px;
                        border: 3px solid var(--vscode-button-background);
                        border-radius: 50%;
                        border-top-color: transparent;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="analyzing-container">
                    <h3>Please Wait</h3>
                    <div class="spinner"></div>
                    <p>Analyzing project structure...</p>
                </div>
            </body>
            </html>
        `;
    }

    private _getMainHtml(webview: vscode.Webview, projectStructure: any): string {
        console.log("inside the project structure view");
        
        const nonce = getNonce();
        console.log("inside the project structure view 2", nonce);

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Project Analyzer</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    textarea {
                        width: 100%;
                        padding: 8px;
                        min-height: 100px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        resize: vertical;
                        margin: 10px 0;
                    }
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        cursor: pointer;
                        margin-top: 10px;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .structure-info {
                        margin-top: 20px;
                        padding: 10px;
                        background-color: var(--vscode-input-background);
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <h3>Project Analyzer</h3>
                <div class="structure-info">
                    <p>Analysis Complete!</p>
                    <p>Total Files: ${projectStructure.files.length}</p>
                    <p>Dependencies: ${Object.keys(projectStructure.dependencies).length}</p>
                </div>
                <textarea placeholder="Enter your request..."></textarea>
                <button onclick="analyzeProject()">Analyze Again</button>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    
                    function analyzeProject() {
                        const textarea = document.querySelector('textarea');
                        const text = textarea.value.trim();
                        if (text) {
                            vscode.postMessage({
                                command: 'analyzeProject',
                                text: text
                            });
                        }
                    }
                </script>
            </body>
            </html>
        `;
    }

    private _getErrorHtml(webview: vscode.Webview, errorMessage: string): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Project Analyzer - Error</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    .error-container {
                        color: var(--vscode-errorForeground);
                        padding: 10px;
                        margin-top: 20px;
                        border: 1px solid var(--vscode-errorForeground);
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <h3>Project Analyzer</h3>
                <div class="error-container">
                    <h4>Error During Analysis</h4>
                    <p>${errorMessage}</p>
                </div>
            </body>
            </html>
        `;
    }
}