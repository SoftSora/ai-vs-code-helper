import * as vscode from 'vscode';
import { DifyApiService, ProjectAnalyzer } from '../services';
import { ExtensionState } from '../state';
import { getNonce } from '../utils';
import { ProjectContext } from '../types';

export class SidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _state: ExtensionState,
        private readonly _projectAnalyzer: ProjectAnalyzer,
        private readonly _context: vscode.ExtensionContext
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

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'analyzeProject':
                    await this._handleInitialAnalysis();
                    break;
                case 'reanalyzeProject':
                    await this._handleReanalysis();
                    break;
                case 'sendToDify':
                    await this._handleDifyRequest(message.text);
                    break;
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

    private async _handleReanalysis(): Promise<void> {
        if (!this._view) return;

        this._view.webview.html = this._getAnalyzingHtml(this._view.webview);

        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace folder found');
            }

            const projectStructure = await this._projectAnalyzer.analyzeProject(workspaceRoot);
            this._state.setProjectStructure(projectStructure);
            this._view.webview.html = this._getMainHtml(this._view.webview, projectStructure);

            await vscode.window.showInformationMessage('Project re-analysis completed successfully');
        } catch (error) {
            console.error('Re-analysis failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';
            vscode.window.showErrorMessage(`Re-analysis failed: ${errorMessage}`);

            if (this._view) {
                this._view.webview.html = this._getErrorHtml(this._view.webview, errorMessage);
            }
        }
    }

    private async _handleDifyRequest(text: string): Promise<void> {
        if (!this._view) return;

        try {
            const projectStructure = this._state.getProjectStructure();
            if (!projectStructure) {
                throw new Error('No project structure available');
            }

            this._view.webview.postMessage({ type: 'setLoading', value: true });

            const difyService = DifyApiService.getInstance(this._context);
            const response = await difyService.getResponse(text, projectStructure);
            
            console.log(response.answer);
            await vscode.window.showInformationMessage(response.answer);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';
            vscode.window.showErrorMessage(`Dify request failed: ${errorMessage}`);
        } finally {
            this._view?.webview.postMessage({ type: 'setLoading', value: false });
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
                    <h4>Please Wait</h4>
                    <div class="spinner"></div>
                    <p>Analyzing project structure...</p>
                </div>
            </body>
            </html>
        `;
    }

    private _getMainHtml(webview: vscode.Webview, projectStructure: any): string {
        const nonce = getNonce();
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
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
    
                    .main-section {
                        margin: 10px -15px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        overflow: hidden;
                        max-width: 350px;
                    }
    
                    .main-header {
                        background-color: var(--vscode-input-background);
                        padding: 0 12px;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        user-select: none;
                    }
    
                    .main-header:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
    
                    .main-content {
                        display: none;
                        padding: 6px;
                        border-top: 1px solid var(--vscode-input-border);
                    }
    
                    .main-content.expanded {
                        display: block;
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
                        padding: 0 12px;
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
                        display: none;
                        padding: 12px;
                        border-top: 1px solid var(--vscode-input-border);
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
                        font-size: 10px;
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
                        width: 95%;    
                        margin: 10px 0;
                        padding: 8px;
                        min-height: 100px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        resize: vertical;
                    }
    
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        padding: 8px 16px;
                        cursor: pointer;
                        margin-bottom: 10px;
                    }
    
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
    
                    .chevron {
                        font-size: 22px;
                        transition: transform 0.2s;
                    }
    
                    .chevron.expanded {
                        transform: rotate(90deg);
                    }
    
                    .loading-indicator {
                        text-align: center;
                        margin-top: 10px;
                    }
    
                    .spinner {
                        width: 20px;
                        height: 20px;
                        border: 2px solid var(--vscode-button-background);
                        border-radius: 50%;
                        border-top-color: transparent;
                        animation: spin 1s linear infinite;
                        margin: 0 auto;
                    }
    
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="main-section">
                    <div class="main-header" data-section="analysis">
                        <h4>Project Analysis Results</h4>
                        <span class="chevron" id="analysis-chevron">›</span>
                    </div>
                    <div class="main-content" id="analysis-content">
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
                        <button id="reanalyzeButton">Analyze Again</button>
                    </div>
                </div>
    
                <div class="main-section">
                    <div class="main-header" data-section="changes">
                        <h4>Request Changes</h4>
                        <span class="chevron" id="changes-chevron">›</span>
                    </div>
                    <div class="main-content" id="changes-content">
                        <textarea id="requestText" placeholder="Enter your request for change..."></textarea>
                        <button id="sendButton">Send</button>
                        <div id="loadingIndicator" class="loading-indicator" style="display: none;">
                            <div class="spinner"></div>
                            <p>Processing request...</p>
                        </div>
                    </div>
                </div>
    
                <script nonce="${nonce}">
                    (function() {
                        const vscode = acquireVsCodeApi();
                        
                        const sections = {
                            analysis: { expanded: true },
                            changes: { expanded: true },
                            technologies: { expanded: true },
                            dependencies: { expanded: false },
                            patterns: { expanded: false },
                            structure: { expanded: false }
                        };
    
                        function toggleSection(sectionId) {
                            const section = sections[sectionId];
                            if (!section) return;
    
                            section.expanded = !section.expanded;
                            
                            const content = document.getElementById(sectionId + '-content');
                            const chevron = document.getElementById(sectionId + '-chevron');
                            
                            if (content) {
                                content.classList.toggle('expanded', section.expanded);
                            }
                            if (chevron) {
                                chevron.classList.toggle('expanded', section.expanded);
                            }
                        }
    
                        document.querySelectorAll('.section-header, .main-header').forEach(header => {
                            const sectionId = header.getAttribute('data-section');
                            if (sectionId) {
                                header.addEventListener('click', () => {
                                    toggleSection(sectionId);
                                });
                            }
                        });
    
                        Object.entries(sections).forEach(([sectionId, section]) => {
                            if (section.expanded) {
                                const content = document.getElementById(sectionId + '-content');
                                const chevron = document.getElementById(sectionId + '-chevron');
                                
                                if (content) {
                                    content.classList.add('expanded');
                                }
                                if (chevron) {
                                    chevron.classList.add('expanded');
                                }
                            }
                        });
    
                        const reanalyzeButton = document.getElementById('reanalyzeButton');
                        if (reanalyzeButton) {
                            reanalyzeButton.addEventListener('click', () => {
                                vscode.postMessage({
                                    command: 'reanalyzeProject'
                                });
                            });
                        }
    
                        const sendButton = document.getElementById('sendButton');
                        if (sendButton) {
                            sendButton.addEventListener('click', () => {
                                const textarea = document.getElementById('requestText');
                                if (textarea && textarea.value.trim()) {
                                    vscode.postMessage({
                                        command: 'sendToDify',
                                        text: textarea.value.trim()
                                    });
                                }
                            });
                        }
    
                        window.addEventListener('message', event => {
                            const message = event.data;
                            if (message.type === 'setLoading') {
                                const loadingIndicator = document.getElementById('loadingIndicator');
                                const sendButton = document.getElementById('sendButton');
                                const textarea = document.getElementById('requestText');
                                
                                if (loadingIndicator && sendButton && textarea) {
                                    loadingIndicator.style.display = message.value ? 'block' : 'none';
                                    sendButton.disabled = message.value;
                                    textarea.disabled = message.value;
                                }
                            }
                        });
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
                <h4>Project Analyzer</h4>
                <div class="error-container">
                    <h4>Error During Analysis</h4>
                    <p>${errorMessage}</p>
                </div>
            </body>
            </html>
        `;
    }
}