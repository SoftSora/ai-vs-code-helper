export interface DIFYResponse {
    event: 'message';
    message_id: string;
    conversation_id: string;
    mode: 'blocking' | 'streaming';
    answer: string;
    metadata?: any;
    created_at?: number;
}

export interface ProjectStructure {
    [key: string]: DirectoryStructure | FileStructure;
}

export interface DirectoryStructure {
    [key: string]: DirectoryStructure | FileStructure;
}

export interface FileStructure {
    type: 'file';
    extension: string;
    content: string;
    path: string;
}