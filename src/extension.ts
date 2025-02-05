import * as vscode from 'vscode';
import { SidebarProvider } from './providers';
import { ProjectAnalyzer } from './services';
import { ExtensionState } from './state';

export function activate(context: vscode.ExtensionContext) {
    const state = new ExtensionState(context);
    const projectAnalyzer = new ProjectAnalyzer();
    
    const sidebarProvider = new SidebarProvider(
        context.extensionUri,
        state,
        projectAnalyzer,
        context
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('mySidebarView', sidebarProvider)
    );
}

export function deactivate() {}