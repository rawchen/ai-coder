// 消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
  timestamp: Date;
  codeBlocks?: CodeBlock[];
  reasoning_content?: string;
  thinking_time?: number;
  model?: ModelType; // 用于显示使用的模型（仅新消息）
}

// 消息内容类型
export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

// 代码块类型
export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  filename?: string;
}

// 对话类型
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: ModelType;
  createdAt: Date;
  updatedAt: Date;
  projectFiles?: ProjectFile[];
}

// 模型类型
export type ModelType = 'deepseek' | 'kimi' | 'glm' | 'gpt' | 'claude';

// 项目文件类型
export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  originalContent?: string;
  history: FileHistory[];
  anchorId?: string; // 关联的代码块锚点ID
  type?: 'code' | 'image'; // 文件类型
  imageUrl?: string; // 图像文件的OSS URL
  previewUrl?: string; // 本地预览URL（用于上传前预览）
  uploadProgress?: number; // 上传进度 0-100
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error'; // 上传状态
}

// 文件历史类型
export interface FileHistory {
  id: string;
  timestamp: Date;
  content: string;
  description: string;
}

// 差异类型
export interface DiffResult {
  filename: string;
  oldContent: string;
  newContent: string;
  additions: number;
  deletions: number;
  changes: DiffChange[];
}

export interface DiffChange {
  type: 'add' | 'remove' | 'unchanged';
  lineNumber: number;
  content: string;
}

// API 响应类型
export interface ApiResponse {
  success: boolean;
  content?: string;
  reasoning_content?: string;
  thinking_time?: number;
  error?: string;
}

// 导出选项
export interface ExportOptions {
  format: 'pdf' | 'zip' | 'copy';
  includeHistory?: boolean;
  filename?: string;
}

// 风格选项
export interface StyleOptions {
  codeStyle: 'modern' | 'classic' | 'minimal';
  commentLevel: 'full' | 'minimal' | 'none';
  indentation: 'auto' | 'spaces2' | 'spaces4' | 'tabs';
}

// 响应模式类型
export type ResponseMode = 'code' | 'simple';

// 流式输出模式
export type StreamMode = 'stream' | 'direct';

// 简单问答模式配置
export interface SimpleQAMode {
  enabled: boolean;
  maxResponseLength: 'short' | 'medium' | 'long';
  includeCodeExamples: boolean;
}