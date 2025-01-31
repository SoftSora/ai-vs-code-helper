import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register a custom view for the sidebar
    const provider = new MyWebviewViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('mySidebarView', provider)
    );
}

class MyWebviewViewProvider implements vscode.WebviewViewProvider {
    private _extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getWebviewContent(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'submit':
                    vscode.window.showInformationMessage(`You entered: ${message.text}`);
                    webviewView.webview.postMessage({ command: 'response', text: `You entered: ${message.text}` });
                    break;
            }
        });
    }

    private getWebviewContent(webview: vscode.Webview): string {
        // Get the style for the current VS Code theme
        const styleVscode = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css'));
        
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>My Webview</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    textarea {
                        margin: 10px 0;
                        padding: 10px;
                        width: 90%;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                    }
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        cursor: pointer;
                        border-radius: 2px;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <h4>Welcome to IntelliGen!</h4>
                <textarea id="textField" placeholder="How can I assist you?" rows="4"></textarea>
                <button id="submitButton">Submit</button>
                <p id="output"></p>
                <script>
                    const vscode = acquireVsCodeApi();
                    const textField = document.getElementById('textField');
                    const submitButton = document.getElementById('submitButton');
                    const output = document.getElementById('output');

                    submitButton.addEventListener('click', () => {
                        const inputText = textField.value;
                        vscode.postMessage({
                            command: 'submit',
                            text: inputText
                        });
                    });

                    // Handle messages from the extension
                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        if (message.command === 'response') {
                            output.innerText = message.text;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}

export function deactivate() {}