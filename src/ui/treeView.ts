import * as vscode from 'vscode';
import { FileSystemService } from '../services/fileSystem';
import { StateManager } from '../services/stateManager';
import { FileStructure, DirectoryStructure, ProjectStructure } from '../types/structure.type';

export class MyTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor() {
        const stateManager = StateManager.getInstance();
        stateManager.onProjectStructureChanged(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (element) {
            // If the element is a directory, return its children
            const path = element.label as string;
            const projectStructure = StateManager.getInstance().getProjectStructure();
            if (projectStructure) {
                const children = this.getDirectoryChildren(path, projectStructure);
                return Promise.resolve(children);
            }
            return Promise.resolve([]);
        } else {
            // Return the top-level items (e.g., project structure)
            const stateManager = StateManager.getInstance();
            const projectStructure = stateManager.getProjectStructure();

            if (!projectStructure) {
                return Promise.resolve([new vscode.TreeItem('No project analyzed')]);
            }

            // Get the top-level items from the project structure
            const items = this.getDirectoryChildren('', projectStructure);
            return Promise.resolve(items);
        }
    }

    private getDirectoryChildren(path: string, structure: DirectoryStructure): vscode.TreeItem[] {
        const items: vscode.TreeItem[] = [];

        for (const [name, item] of Object.entries(structure)) {
            const fullPath = path ? `${path}/${name}` : name;

            if (this.isFile(item)) {
                // If it's a file, create a TreeItem for it
                const treeItem = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
                treeItem.command = {
                    command: 'vscode.open',
                    title: 'Open File',
                    arguments: [vscode.Uri.file(item.path)]
                };
                items.push(treeItem);
            } else {
                // If it's a directory, create a TreeItem for it and allow it to be expanded
                const treeItem = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.Collapsed);
                items.push(treeItem);
            }
        }

        return items;
    }

    private isFile(item: FileStructure | DirectoryStructure): item is FileStructure {
        return (item as FileStructure).type === 'file';
    }
}