export interface ProjectContext {
    files: FileInfo[];
    summary?: string;
    mainTechnologies?: string[];
    folderStructure?: string;
    codePatterns?: string[];
    packageDetails: {
        name: string;
        version: string;
        mainDependencies: string[];
        devDependencies: string[];
    };
    entryPoints: string[];
    configFiles: string[];
}

export interface FileInfo {
    path: string;
    name: string;
    extension: string;
    content: string;
}