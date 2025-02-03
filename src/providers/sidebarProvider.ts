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
    ) { }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): Promise<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Set up message handling before starting analysis
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'analyzeProject') {
                await this._handleInitialAnalysis();
            }
        });

        await this._handleInitialAnalysis();
    }

    private async _handleInitialAnalysis(): Promise<void> {
        if (!this._view) return;

        this._view.webview.html = this._getAnalyzingHtml(this._view.webview);

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

            this._view.webview.html = this._getMainHtml(this._view.webview, projectStructure);
            await vscode.window.showInformationMessage('Project analysis completed successfully');

        } catch (error) {
            console.log(error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';
            vscode.window.showErrorMessage(`Analysis failed: ${errorMessage}`);

            if (this._view) {
                this._view.webview.html = this._getErrorHtml(this._view.webview, errorMessage);
            }
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
                        margin: 10px auto;
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
        const nonce = getNonce();
        const fileCount = projectStructure?.files?.length || 0;
        const mainTechnologies = projectStructure?.mainTechnologies || [];
        const dependencies = projectStructure?.packageDetails?.mainDependencies || [];
        const devDependencies = projectStructure?.packageDetails?.devDependencies || [];
        const folderStructure = projectStructure?.folderStructure || '';
        const codePatterns = projectStructure?.codePatterns || [];
    
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
    
                    .structure-info {
                        margin-bottom: 20px;
                    }
    
                    .section {
                        margin-bottom: 10px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        overflow: hidden;
                    }
    
                    .section-header {
                        background-color: var(--vscode-input-background);
                        padding: 8px 12px;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        user-select: none;
                    }
    
                    .section-header:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
    
                    .section-content {
                        padding: 12px;
                        display: none;
                        border-top: 1px solid var(--vscode-input-border);
                        background-color: var(--vscode-editor-background);
                    }
    
                    .section-content.expanded {
                        display: block;
                    }
    
                    .tech-tag {
                        display: inline-block;
                        padding: 4px 8px;
                        margin: 2px;
                        background-color: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        border-radius: 4px;
                        font-size: 12px;
                    }
    
                    .folder-tree {
                        padding-left: 20px;
                    }
    
                    .folder-item {
                        margin: 4px 0;
                    }
    
                    .pattern-item {
                        margin: 6px 0;
                        padding: 4px 8px;
                        background-color: var(--vscode-input-background);
                        border-radius: 4px;
                    }
    
                    textarea {
                        width: 90%;
                        padding: 8px;
                        min-height: 100px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        resize: vertical;
                        margin-right: 10px;
                    }
    
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        cursor: pointer;
                        margin-bottom: 10px;
                    }
    
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
    
                    .chevron {
                        transition: transform 0.2s;
                    }
    
                    .chevron.expanded {
                        transform: rotate(90deg);
                    }
                </style>
            </head>
            <body>
                <h3>Project Analysis Results</h3>
                <div class="structure-info">
                    <div class="section">
                        <div class="section-header" data-section="technologies">
                            <span>Technologies & Framework</span>
                            <span class="chevron" id="technologies-chevron">›</span>
                        </div>
                        <div class="section-content" id="technologies-content">
                            ${mainTechnologies.map((tech: string) => `<span class="tech-tag">${tech}</span>`).join('')}
                        </div>
                    </div>
    
                    <div class="section">
                        <div class="section-header" data-section="dependencies">
                            <span>Dependencies (${dependencies.length})</span>
                            <span class="chevron" id="dependencies-chevron">›</span>
                        </div>
                        <div class="section-content" id="dependencies-content">
                            <h4>Main Dependencies</h4>
                            ${dependencies.map((dep: string) => `<div class="pattern-item">${dep}</div>`).join('')}
                            ${devDependencies.length ? `
                                <h4>Dev Dependencies</h4>
                                ${devDependencies.map((dep: string) => `<div class="pattern-item">${dep}</div>`).join('')}
                            ` : ''}
                        </div>
                    </div>
    
                    <div class="section">
                        <div class="section-header" data-section="patterns">
                            <span>Code Patterns</span>
                            <span class="chevron" id="patterns-chevron">›</span>
                        </div>
                        <div class="section-content" id="patterns-content">
                            ${codePatterns.map((pattern: string) => `<div class="pattern-item">${pattern}</div>`).join('')}
                        </div>
                    </div>
    
                    <div class="section">
                        <div class="section-header" data-section="structure">
                            <span>Folder Structure</span>
                            <span class="chevron" id="structure-chevron">›</span>
                        </div>
                        <div class="section-content" id="structure-content">
                            <div class="folder-tree">
                                ${folderStructure.split('\n').map((line: string) => `<div class="folder-item">${line}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
    
                <button onclick="analyzeProject()">Analyze Again</button>

                <h3>Request Changes</h3>
                <textarea placeholder="Enter your request for change..."></textarea>
    
                <script nonce="${nonce}">
                    (function() {
                        // Initialize vscode API
                        const vscode = acquireVsCodeApi();
                        
                        // Store section states
                        const sectionStates = {
                            technologies: true,
                            dependencies: false,
                            patterns: false,
                            structure: false
                        };
    
                        document.querySelectorAll('.section-header').forEach(header => {
                            header.addEventListener('click', () => {
                                const sectionId = header.getAttribute('data-section');
                                if (sectionId) {
                                    toggleSection(sectionId);
                                }
                            });
                        });
    
                        function toggleSection(sectionId) {
                            const content = document.getElementById(sectionId + '-content');
                            const chevron = document.getElementById(sectionId + '-chevron');
                            
                            if (content && chevron) {
                                sectionStates[sectionId] = !sectionStates[sectionId];
                                content.classList.toggle('expanded', sectionStates[sectionId]);
                                chevron.classList.toggle('expanded', sectionStates[sectionId]);
                            }
                        }
    
                        Object.entries(sectionStates).forEach(([sectionId, isExpanded]) => {
                            const content = document.getElementById(sectionId + '-content');
                            const chevron = document.getElementById(sectionId + '-chevron');
                            
                            if (content && chevron && isExpanded) {
                                content.classList.add('expanded');
                                chevron.classList.add('expanded');
                            }
                        });
    
                        window.analyzeProject = function() {
                            const textarea = document.querySelector('textarea');
                            const text = textarea.value.trim();
                            if (text) {
                                vscode.postMessage({
                                    command: 'analyzeProject',
                                    text: text
                                });
                            }
                        };
                    })();
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