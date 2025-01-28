import * as vscode from 'vscode';
import { DifyApiService, FileSystemService, ProjectContextService } from '../services';
import { Logger } from '../utils';

export function createAnalyzeProjectCommand() {
    return async () => {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        try {
            const fileSystemService = FileSystemService.getInstance();
            const projectStructure = await fileSystemService.analyzeProjectStructure(workspaceRoot);

            console.log(projectStructure);
            
            const projectContextService = ProjectContextService.getInstance();
            const projectContext = projectContextService.generateProjectSummary(projectStructure);

            const aiService = DifyApiService.getInstance();
            const response = await aiService.query('Generate code for X feature', projectStructure);

            vscode.window.showInformationMessage(`Dify.ai Response: ${response.answer}`);
        } catch (error) {
            Logger.error('Error analyzing project:', error);
        }
    };
}