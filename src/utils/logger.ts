import * as vscode from 'vscode';

export class Logger {
    public static log(message: string): void {
        console.log(message);
    }

    public static error(message: string, error?: unknown): void {
        console.error(message, error);
        vscode.window.showErrorMessage(`${message}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}