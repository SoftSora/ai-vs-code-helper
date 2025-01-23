import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ProjectStructure, DIFYContext } from '../types';
import { DifyApiService, FileSystemService, ProjectContextService, StateManager } from '../services';
import { StatusBarManager } from '../ui';
import { MyTreeDataProvider } from '../ui/treeView';

let projectStructure: ProjectStructure = null;

export function registerCommands(context: vscode.ExtensionContext) {
    const fileSystemService = FileSystemService.getInstance();
    const difyApiService = DifyApiService.getInstance();
    const stateManager = StateManager.getInstance();

    const analyzeCommand = vscode.commands.registerCommand(
        'difyassistant.analyzeProject',
        createAnalyzeProjectCommand(fileSystemService, stateManager)
    );

    const askCommand = vscode.commands.registerCommand(
        'difyassistant.askQuestion',
        createAskQuestionCommand(difyApiService, stateManager)
    );

    const refreshTreeCommand = vscode.commands.registerCommand(
        'difyassistant.refreshTree',
        () => {
            const treeDataProvider = new MyTreeDataProvider();
            vscode.window.registerTreeDataProvider('difyassistant.treeView', treeDataProvider);
        }
    );

    context.subscriptions.push(analyzeCommand, askCommand, refreshTreeCommand);
}

function createAnalyzeProjectCommand(fileSystemService: FileSystemService, stateManager: StateManager) {
    return async () => {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing project structure...",
            cancellable: false
        }, async () => {
            const projectStructure = await fileSystemService.analyzeProjectStructure(workspaceRoot);
            stateManager.setProjectStructure(projectStructure);
            console.log('Project structure:', projectStructure);
            vscode.window.showInformationMessage('Project structure analysis complete');
            
            const statusBarManager = StatusBarManager.getInstance();
            statusBarManager.updateStatus('Project analyzed ✓');
        });
    };
}

async function generateFiles(files: { path: string, content: string }[]): Promise<string[]> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return [];
    }

    const processedFiles: string[] = [];

    for (const file of files) {
        const fullPath = path.resolve(workspaceRoot, file.path);

        try {
            // Ensure the directory exists
            await fs.ensureDir(path.dirname(fullPath));
            // Check if file exists
            const fileExists = await fs.pathExists(fullPath);

            if (fileExists) {
                const existingContent = await fs.readFile(fullPath, 'utf8');
                // Check if the new content is already present in the file
                if (existingContent.includes(file.content.trim())) {
                    processedFiles.push(`Skipped (already exists): ${file.path}`);
                    continue;
                }

                // Append new content to existing content with a separator
                const updatedContent = existingContent.trim() + '\n\n' + file.content.trim();
                await fs.writeFile(fullPath, updatedContent);
                processedFiles.push(`Updated (appended): ${file.path}`);
            } else {
                // For new files, just write the content
                await fs.writeFile(fullPath, file.content);
                processedFiles.push(`Created: ${file.path}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing file ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return processedFiles;
}

async function handleDifyResponse(
    difyApiService: DifyApiService,
    question: string,
    context: DIFYContext,
    outputChannel: vscode.OutputChannel
) {
    let currentContext = { ...context };
    try {
        const response = await difyApiService.query(question, currentContext);
        outputChannel.appendLine('Question: ' + question);
        outputChannel.appendLine('\nResponse:');
        outputChannel.appendLine(response.answer);

        // Parse the response for code generation instructions
        const codeBlocks = response.answer.match(/```(?:typescript|javascript|json)\s*([\s\S]*?)```/gmi);
        if (codeBlocks) {
            for (const block of codeBlocks) {
                const codeContent = block.replace(/```(?:typescript|javascript|json)\s*|```/gi, '').trim();
                // Generate or update files based on the code content
                // You can use the `generateFiles` function here
            }
        }

        outputChannel.show();
        return { response, context: currentContext };
    } catch (error) {
        console.error('Response handler error:', error);
        outputChannel.appendLine('\nError: ' + (error instanceof Error ? error.message : String(error)));
        throw error;
    }
}

function createAskQuestionCommand(
    difyApiService: DifyApiService,
    stateManager: StateManager
) {
    let conversationContext: DIFYContext = {};
    const contextService = ProjectContextService.getInstance();
    const outputChannel = vscode.window.createOutputChannel('DIFY Assistant');

    return async () => {
        const projectStructure = stateManager.getProjectStructure();
        if (!projectStructure) {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (workspaceRoot) {
                try {
                    const fileSystemService = FileSystemService.getInstance();
                    const newStructure = await fileSystemService.analyzeProjectStructure(workspaceRoot);
                    stateManager.setProjectStructure(newStructure);
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to analyze project structure. Please try running the analyze command manually.');
                    return;
                }
            } else {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }
        }

        const question = await vscode.window.showInputBox({
            prompt: 'What would you like to know about the codebase?',
            placeHolder: 'e.g., How is the authentication implemented?'
        });

        if (!question) return;

        try {
            const currentStructure = stateManager.getProjectStructure();
            const projectSummary = contextService.generateProjectSummary(currentStructure!);

            let fileContext = '';
            if (vscode.window.activeTextEditor) {
                const currentFile = vscode.window.activeTextEditor.document;
                fileContext = contextService.generateFileContext(
                    currentFile.fileName,
                    currentFile.getText()
                );
            }

            // Combine question with context
            const enhancedQuery = `
                Context:
                ${projectSummary}
                ${fileContext}

                Question: ${question}

                Note: If you need to generate or update files, please provide the file generation instructions in the following JSON format wrapped in a code block:

                \`\`\`json files
                [
                    {
                        "path": "relative/path/to/file.ts",
                        "content": "file content here"
                    }
                ]
                \`\`\`
            `;

            const initialContext: DIFYContext = {
                ...conversationContext,
                currentFile: vscode.window.activeTextEditor?.document.fileName
            };

            const outputChannel = vscode.window.createOutputChannel('DIFY Assistant');
            const result = await handleDifyResponse(
                difyApiService,
                enhancedQuery,
                initialContext,
                outputChannel
            );

            conversationContext = result.context;

        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred');
            }
        }
    };
}