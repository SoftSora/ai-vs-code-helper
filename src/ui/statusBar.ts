import * as vscode from 'vscode';

export class StatusBarManager {
    private static instance: StatusBarManager;
    private statusBarItem: vscode.StatusBarItem;

    private constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    }

    public static getInstance(): StatusBarManager {
        if (!StatusBarManager.instance) {
            StatusBarManager.instance = new StatusBarManager();
        }
        return StatusBarManager.instance;
    }

    public updateStatus(text: string): void {
        this.statusBarItem.text = text;
        this.statusBarItem.show();
    }

    public hideStatus(): void {
        this.statusBarItem.hide();
    }
}