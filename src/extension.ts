import * as vscode from 'vscode';
import { DifyApiService, ProjectStructure, registerCommands, SidebarProvider, StatusBarManager } from './';

export let globalProjectStructure: ProjectStructure | null = null;

export async function activate(context: vscode.ExtensionContext) {
    await DifyApiService.initialize(context);
    console.log("DIFY AI assistant is activated");

    const sidebarProvider = new SidebarProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );

    await analyzeProjectOnStart(context);

    registerCommands(context);
    const statusBarManager = StatusBarManager.getInstance();
    context.subscriptions.push(statusBarManager.getStatusBarItem());

    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            await analyzeProjectOnStart(context);
        })
    );
}

async function analyzeProjectOnStart(context: vscode.ExtensionContext) {
    const FileSystemService = (await import('./services/fileSystem')).FileSystemService;
    const fileSystemService = FileSystemService.getInstance();
    
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspaceRoot) {
        try {
            globalProjectStructure = await fileSystemService.analyzeProjectStructure(workspaceRoot);
            console.log('Project structure analyzed on startup');
            
            const statusBarManager = StatusBarManager.getInstance();
            statusBarManager.updateStatus('Project analyzed ✓');
        } catch (error) {
            console.error('Error analyzing project structure:', error);
            vscode.window.showErrorMessage('Failed to analyze project structure on startup');
        }
    }
}

export function deactivate() {
    globalProjectStructure = null;
}
