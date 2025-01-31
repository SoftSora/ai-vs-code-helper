import * as vscode from 'vscode';
import * as path from 'path';
import { FileInfo, ProjectContext } from '../types';

export class ProjectAnalyzer {
    private readonly _excludedDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out']);
    private readonly _supportedExtensions = new Set(['.ts', '.js', '.jsx', '.tsx', '.json', '.html', '.css']);

    public async analyzeProject(rootPath: string): Promise<ProjectContext> {
        const files: FileInfo[] = [];
        await this._analyzeDirectory(rootPath, files);

        return this._generateProjectContext(rootPath, files);
    }

    private async _analyzeDirectory(dirPath: string, files: FileInfo[]): Promise<void> {
        const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));

        for (const [name, type] of entries) {
            const fullPath = path.join(dirPath, name);
            const relativePath = path.relative(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '', fullPath);

            if (type === vscode.FileType.Directory) {
                if (!this._excludedDirs.has(name)) {
                    await this._analyzeDirectory(fullPath, files);
                }
            } else if (type === vscode.FileType.File) {
                const ext = path.extname(name);
                if (this._supportedExtensions.has(ext)) {
                    const content = await this._readFile(fullPath);
                    files.push({
                        path: relativePath,
                        name,
                        extension: ext,
                        content
                    });
                }
            }
        }
    }

    private async _generateProjectContext(rootPath: string, files: FileInfo[]): Promise<ProjectContext> {
        const packageJson = await this._getPackageJson(rootPath);
        const folderStructure = this._analyzeFolderStructure(files);
        const technologies = this._detectTechnologies(files, packageJson);
        const patterns = this._analyzeCodePatterns(files);
        const entryPoints = this._findEntryPoints(files, packageJson);
        const configFiles = this._identifyConfigFiles(files);

        const summary = this._generateSummary({
            technologies,
            patterns,
            folderStructure,
            packageJson,
            entryPoints,
            configFiles
        });

        return {
            files,
            summary,
            mainTechnologies: technologies,
            folderStructure,
            codePatterns: patterns,
            packageDetails: {
                name: packageJson.name || 'unknown',
                version: packageJson.version || '0.0.0',
                mainDependencies: Object.keys(packageJson.dependencies || {}),
                devDependencies: Object.keys(packageJson.devDependencies || {})
            },
            entryPoints,
            configFiles
        };
    }

    private _analyzeFolderStructure(files: FileInfo[]): string {
        const structure = new Map<string, Set<string>>();
        
        files.forEach(file => {
            const dir = path.dirname(file.path);
            if (!structure.has(dir)) {
                structure.set(dir, new Set());
            }
            structure.get(dir)?.add(file.name);
        });

        let description = '';
        structure.forEach((files, dir) => {
            description += `\n- ${dir}/: Contains ${Array.from(files).join(', ')}`;
        });

        return description;
    }

    private _detectTechnologies(files: FileInfo[], packageJson: any): string[] {
        const technologies = new Set<string>();

        if (packageJson.dependencies) {
            if (packageJson.dependencies['react']) technologies.add('React');
            if (packageJson.dependencies['vue']) technologies.add('Vue');
            if (packageJson.dependencies['express']) technologies.add('Express');
            if (packageJson.dependencies['typescript']) technologies.add('TypeScript');
        }

        files.forEach(file => {
            if (file.extension === '.ts' || file.extension === '.tsx') technologies.add('TypeScript');
            if (file.extension === '.jsx' || file.extension === '.tsx') technologies.add('React');
            if (file.content.includes('import { Injectable }')) technologies.add('Angular');
            if (file.content.includes('express()')) technologies.add('Express');
        });

        return Array.from(technologies);
    }

    private _analyzeCodePatterns(files: FileInfo[]): string[] {
        const patterns: Set<string> = new Set();

        files.forEach(file => {
            // Check for common patterns in the code
            if (file.content.includes('class') && file.content.includes('extends')) {
                patterns.add('Class Inheritance');
            }
            if (file.content.includes('interface ')) {
                patterns.add('Interface-based Design');
            }
            if (file.content.includes('async ') && file.content.includes('await ')) {
                patterns.add('Async/Await Pattern');
            }
            if (file.content.includes('private ') || file.content.includes('protected ')) {
                patterns.add('Access Modifiers');
            }
            if (file.content.includes('new Error(')) {
                patterns.add('Error Handling');
            }
        });

        return Array.from(patterns);
    }

    private _findEntryPoints(files: FileInfo[], packageJson: any): string[] {
        const entryPoints = new Set<string>();

        if (packageJson.main) {
            entryPoints.add(packageJson.main);
        }

        // Look for common entry point files
        files.forEach(file => {
            if (['index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js'].includes(file.name)) {
                entryPoints.add(file.path);
            }
        });

        return Array.from(entryPoints);
    }

    private _identifyConfigFiles(files: FileInfo[]): string[] {
        return files
            .filter(file => 
                file.name.includes('config') ||
                file.name.endsWith('.json') ||
                file.name.endsWith('.env') ||
                file.name.endsWith('.yml') ||
                file.name.endsWith('.yaml')
            )
            .map(file => file.path);
    }

    private _generateSummary(data: any): string {
        return `
This is a ${data.technologies.join(', ')} project with a ${data.patterns.includes('Interface-based Design') ? 'strong typed' : 'dynamic'} architecture.

Project Structure:
${data.folderStructure}

Main Entry Points: ${data.entryPoints.join(', ')}

The project implements the following patterns:
${data.patterns.join(', ')}

Configuration files include: ${data.configFiles.join(', ')}

Dependencies are managed through npm/yarn with key dependencies including:
${data.packageJson.dependencies ? Object.keys(data.packageJson.dependencies).join(', ') : 'No dependencies found'}
        `.trim();
    }

    private async _getPackageJson(rootPath: string): Promise<any> {
        try {
            const packageJsonPath = path.join(rootPath, 'package.json');
            const content = await this._readFile(packageJsonPath);
            return JSON.parse(content);
        } catch {
            return {};
        }
    }

    private async _readFile(filePath: string): Promise<string> {
        const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
        return Buffer.from(content).toString('utf-8');
    }
}
