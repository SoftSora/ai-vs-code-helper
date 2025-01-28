import * as vscode from 'vscode';
import { createAnalyzeProjectCommand } from './analyzeProject';
import { createAskQuestionCommand } from './askQuestion';
import { DifyApiService, StateManager } from '../services';

export function registerCommands(context: vscode.ExtensionContext) {
    const difyApiService = DifyApiService.getInstance();
    const stateManager = StateManager.getInstance(context);

    const analyzeCommand = vscode.commands.registerCommand(
        'difyassistant.analyzeProject',
        createAnalyzeProjectCommand()
    );

    const askCommand = vscode.commands.registerCommand(
        'difyassistant.askQuestion',
        createAskQuestionCommand(difyApiService, stateManager)
    );

    context.subscriptions.push(analyzeCommand, askCommand);
}