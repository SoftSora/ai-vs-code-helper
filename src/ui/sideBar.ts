import * as vscode from 'vscode';
import { getNonce } from '../utils';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'difyassistant-sidebar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _extensionContext: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('Webview resolved');

        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {

            console.log('Message received:', data);

            switch (data.type) {
                case 'analyze-project':
                    vscode.commands.executeCommand('difyassistant.analyzeProject');
                    break;
                case 'ask-question':
                    vscode.commands.executeCommand('difyassistant.askQuestion');
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>DIFY Assistant</title>
                <style>
                    body { padding: 10px; }
                    button {
                        width: 100%;
                        padding: 8px;
                        margin: 5px 0;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 2px;
                        cursor: pointer;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div>
                    <button id="analyzeBtn">Analyze Project</button>
                    <button id="askBtn">Ask Question</button>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('analyzeBtn').addEventListener('click', () => {
                        vscode.postMessage({ type: 'analyze-project' });
                    });
                    
                    document.getElementById('askBtn').addEventListener('click', () => {
                        vscode.postMessage({ type: 'ask-question' });
                    });
                </script>
            </body>
            </html>`;
    }
}
