import * as vscode from 'vscode';
import { StateManager } from '../services';

export function showWebView(stateManager: StateManager) {
    if (!stateManager.context) {
        throw new Error('StateManager context is not initialized');
    }

    const panel = vscode.window.createWebviewPanel(
        'aiCodeGenerator',
        'AI Code Generator',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(
        async (message) => {
            switch (message.command) {
                case 'submitQuery':
                    const userQuery = message.text;
                    vscode.window.showInformationMessage(`User Query: ${userQuery}`);
                    break;
            }
        },
        undefined,
        stateManager.context.subscriptions
    );
}

function getWebviewContent(): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Code Generator</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }
                input, button {
                    margin-top: 10px;
                    padding: 10px;
                    width: 100%;
                }
            </style>
        </head>
        <body>
            <h1>AI Code Generator</h1>
            <p>Enter your query below:</p>
            <input type="text" id="queryInput" placeholder="Enter your query..." />
            <button id="submitButton">Submit</button>

            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById('submitButton').addEventListener('click', () => {
                    const query = document.getElementById('queryInput').value;
                    vscode.postMessage({
                        command: 'submitQuery',
                        text: query
                    });
                });
            </script>
        </body>
        </html>
    `;
}