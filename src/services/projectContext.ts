import { ProjectStructure, DirectoryStructure, FileStructure } from '../types';
import { Logger } from '../utils/logger';

export class ProjectContextService {
    private static instance: ProjectContextService;

    private constructor() {}

    public static getInstance(): ProjectContextService {
        if (!ProjectContextService.instance) {
            ProjectContextService.instance = new ProjectContextService();
        }
        return ProjectContextService.instance;
    }

    public generateProjectSummary(structure: ProjectStructure): string {
        try {
            return this.summarizeStructure(structure);
        } catch (error) {
            Logger.error('Error generating project summary:', error);
            return 'Unable to generate project summary.';
        }
    }

    private summarizeStructure(structure: DirectoryStructure, depth: number = 0): string {
        let summary = '';
        const indent = '  '.repeat(depth);

        for (const [name, item] of Object.entries(structure)) {
            if (this.shouldIncludeInSummary(name, item)) {
                if (this.isFile(item)) {
                    // Summarize file
                    summary += `${indent}- ${name} (${item.extension})\n`;
                } else {
                    // Summarize directory
                    summary += `${indent}+ ${name}/\n`;
                    summary += this.summarizeStructure(item as DirectoryStructure, depth + 1);
                }
            }
        }

        return summary;
    }

    private shouldIncludeInSummary(name: string, item: FileStructure | DirectoryStructure): boolean {
        // Exclude common directories and files
        if (name.startsWith('.') || name === 'node_modules' || name === 'dist') {
            return false;
        }

        // Include only files with supported extensions
        if (this.isFile(item)) {
            return ['.js', '.ts', '.py', '.java', '.html', '.css'].includes(item.extension); // Add more extensions as needed
        }

        return true;
    }

    private isFile(item: FileStructure | DirectoryStructure): item is FileStructure {
        return (item as FileStructure).type === 'file';
    }
}