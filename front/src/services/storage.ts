import { Conversation, FileHistory, ModelType, ProjectFile, SimpleQAMode, StreamMode } from '../types';

const STORAGE_KEY = 'code_gen_conversations';
const FILES_KEY = 'code_gen_files';
const SETTINGS_KEY = 'code_gen_settings';
const CURRENT_CONVERSATION_KEY = 'code_gen_current_conversation';

// 默认设置
const DEFAULT_SETTINGS = {
  model: 'deepseek' as ModelType,
  simpleQAMode: {
    enabled: true,
    maxResponseLength: 'medium' as const
  },
  streamMode: 'stream' as const
};

// 保存设置
export function saveSettings(settings: {
  model: ModelType;
  simpleQAMode: SimpleQAMode;
  streamMode: StreamMode;
}): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

// 加载设置
export function loadSettings(): {
  model: ModelType;
  simpleQAMode: SimpleQAMode;
  streamMode: StreamMode;
} {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      return {...DEFAULT_SETTINGS, ...JSON.parse(data)};
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
  return DEFAULT_SETTINGS;
}

// 保存对话
export function saveConversations(conversations: Conversation[]): void {
  let dataToSave = [...conversations];

  // 循环尝试保存，如果出现 QuotaExceededError 则清理最旧的 5 条对话
  while (dataToSave.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      if (dataToSave.length < conversations.length) {
        console.warn(`已清理 ${conversations.length - dataToSave.length} 条旧对话`);
      }
      break; // 保存成功，退出循环
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        if (dataToSave.length > 5) {
          console.warn('存储空间不足，清理最旧的 5 条对话...');
          dataToSave = dataToSave.slice(0, -5); // 移除最旧的 5 条（数组末尾）
        } else if (dataToSave.length > 0) {
          // 剩余不足 5 条，全部清理
          console.error('无法保存，存储空间已满');
          dataToSave = [];
        }
      } else {
        console.error('保存对话失败:', error);
        break;
      }
    }
  }
}

// 加载对话
export function loadConversations(): Conversation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const conversations = JSON.parse(data);
      return conversations.map((c: Conversation) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        messages: c.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }));
    }
  } catch (error) {
    console.error('加载对话失败:', error);
  }
  return [];
}

// 保存项目文件
export function saveProjectFiles(files: ProjectFile[]): void {
  try {
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
  } catch (error) {
    console.error('保存文件失败:', error);
  }
}

// 加载项目文件
export function loadProjectFiles(): ProjectFile[] {
  try {
    const data = localStorage.getItem(FILES_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载文件失败:', error);
  }
  return [];
}

// 添加文件历史记录
export function addFileHistory(
  file: ProjectFile,
  newContent: string,
  description: string
): ProjectFile {
  const history: FileHistory = {
    id: generateId(),
    timestamp: new Date(),
    content: file.content,
    description
  };

  return {
    ...file,
    content: newContent,
    history: [...file.history, history]
  };
}

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 格式化日期
export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 保存当前选中的会话ID
export function saveCurrentConversationId(conversationId: string | null): void {
  try {
    if (conversationId) {
      localStorage.setItem(CURRENT_CONVERSATION_KEY, conversationId);
    } else {
      localStorage.removeItem(CURRENT_CONVERSATION_KEY);
    }
  } catch (error) {
    console.error('保存当前会话ID失败:', error);
  }
}

// 加载当前选中的会话ID
export function loadCurrentConversationId(): string | null {
  try {
    const conversationId = localStorage.getItem(CURRENT_CONVERSATION_KEY);
    return conversationId;
  } catch (error) {
    console.error('加载当前会话ID失败:', error);
    return null;
  }
}
