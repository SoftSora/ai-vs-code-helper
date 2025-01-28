import * as vscode from 'vscode';
import { createAnalyzeProjectCommand } from './commands/analyzeProject';
import { DifyApiService } from './services';

export function activate(context: vscode.ExtensionContext) {
    DifyApiService.initialize(context);

    const analyzeCommand = vscode.commands.registerCommand('extension.analyzeProject', createAnalyzeProjectCommand());
    context.subscriptions.push(analyzeCommand);
}