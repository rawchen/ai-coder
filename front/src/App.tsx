import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatInput, ChatInputRef, ChatMessage, ConversationList, ConversationListRef, DiffViewer, FileExplorer } from './components';
import {
  CodeBlock,
  Conversation,
  DiffResult,
  FileHistory,
  Message,
  MessageContent,
  ModelType,
  ProjectFile,
  ResponseMode,
  SimpleQAMode,
  StreamMode,
  StyleOptions
} from './types';
import {
  callAI,
  detectLanguage,
  extractCodeBlocks,
  generateConversationTitle,
  isCodeFile,
  isImageFile,
  uploadFileToOSS
} from './services/api';
import {
  addFileHistory,
  generateId,
  loadConversations,
  loadCurrentConversationId,
  loadSettings,
  saveConversations,
  saveCurrentConversationId,
  saveSettings
} from './services/storage';
import { calculateDiff, copyToClipboard, exportAsPdf, exportConversationImage } from './services/utils';
import {
  ChevronDown,
  Code2,
  FileText,
  FolderOpen,
  GitCompare,
  Github,
  Image as ImageIcon,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Search as SearchIcon,
  Sun
} from 'lucide-react';
import { useScrollStore } from './stores/scrollStore';
import { scrollEventBus } from './services/eventBus';

type RightPanelTab = 'files' | 'diff';

// 设备类型检测
type DeviceType = 'mobile' | 'ipad' | 'desktop';

const getDeviceType = (): DeviceType => {
  const width = window.innerWidth;
  // iPad 通常在 768px - 1024px 之间
  if (width < 768) return 'mobile';
  if (width >= 768 && width <= 1024) return 'ipad';
  return 'desktop';
};

// 根据设备类型获取默认面板状态
const getDefaultPanelStates = () => {
  const device = getDeviceType();
  if (device === 'mobile') {
    return {leftOpen: false, rightOpen: false};
  } else if (device === 'ipad') {
    return {leftOpen: true, rightOpen: false};
  }
  return {leftOpen: true, rightOpen: true};
};

// 解析内容中的代码块，计算 parts 和 codeBlockIndices（与 ChatMessage 中 parseCodeBlocks 逻辑一致）
function parseContentParts(
  content: string,
  parts: { type: 'text' | 'code' }[],
  codeBlockIndices: number[],
  isInner: boolean
): void {
  // 允许代码块前有任意空白缩进
  const openRegex = /([ \t]*)(`{3,})(\w+)?(?:\s*\/\/\s*(.+))?\n/g;
  let pos = 0;

  while (pos < content.length) {
    openRegex.lastIndex = pos;
    const openMatch = openRegex.exec(content);

    if (!openMatch) {
      if (pos < content.length) {
        parts.push({type: 'text'});
      }
      break;
    }

    const backticks = openMatch[2];
    const lang = openMatch[3] || 'plaintext';
    const codeStart = openMatch.index + openMatch[0].length;

    if (openMatch.index > pos) {
      parts.push({type: 'text'});
    }

    // 查找匹配的闭合反引号（允许前面有相同的缩进或更少）
    const escapedBackticks = backticks.replace(/`/g, '\\`');
    const closeRegex = new RegExp(`\\n[ \\t]*${escapedBackticks}(?=\\s*\\n|$)`);
    const closeMatch = closeRegex.exec(content.slice(codeStart));

    if (closeMatch) {
      const codeContent = content.slice(codeStart, codeStart + closeMatch.index).trim();

      // 如果是 md/markdown 包裹，递归解析内部内容
      if ((lang === 'md' || lang === 'markdown') && !isInner) {
        parseContentParts(codeContent, parts, codeBlockIndices, true);
      } else {
        parts.push({type: 'code'});
        codeBlockIndices.push(parts.length - 1);
      }

      pos = codeStart + closeMatch.index + closeMatch[0].length;
    } else {
      // 未闭合的代码块
      parts.push({type: 'code'});
      codeBlockIndices.push(parts.length - 1);
      break;
    }
  }
}

function App() {
  // 状态
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const savedConversations = loadConversations();
    return savedConversations;
  });
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    const savedConversations = loadConversations();
    const savedCurrentId = loadCurrentConversationId();
    const DISPLAY_COUNT = 20; // 瀑布流默认显示数量

    if (savedConversations.length > 0) {
      let targetId = savedCurrentId;

      // 如果保存的ID不存在于当前会话列表中，则使用第一个会话
      if (targetId && !savedConversations.find(c => c.id === targetId)) {
        targetId = savedConversations[0].id;
      } else if (targetId) {
        // 检查ID是否在前20个会话中（瀑布流显示范围）
        const first20Ids = savedConversations.slice(0, DISPLAY_COUNT).map(c => c.id);
        if (!first20Ids.includes(targetId)) {
          // 如果不在前20个，使用第一个会话
          targetId = savedConversations[0].id;
        }
      } else if (!targetId) {
        targetId = savedConversations[0].id;
      }

      // 如果最终的targetId与保存的不同，更新localStorage
      if (targetId !== savedCurrentId) {
        saveCurrentConversationId(targetId);
      }

      return targetId;
    }
    return null;
  });
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>(() => {
    const savedConversations = loadConversations();
    const savedCurrentId = loadCurrentConversationId();

    if (savedConversations.length > 0) {
      let targetId = savedCurrentId;
      if (targetId && !savedConversations.find(c => c.id === targetId)) {
        targetId = savedConversations[0].id;
      } else if (!targetId) {
        targetId = savedConversations[0].id;
      }
      const targetConversation = savedConversations.find(c => c.id === targetId);
      if (targetConversation) {
        return targetConversation.projectFiles || [];
      }
    }
    return [];
  });
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [model, setModel] = useState<ModelType>(() => {
    const savedSettings = loadSettings();
    return savedSettings.model;
  });
  const [responseMode, setResponseMode] = useState<ResponseMode>(() => {
    const savedSettings = loadSettings();
    return savedSettings.simpleQAMode.enabled ? 'simple' : 'code';
  });
  const [streamMode, setStreamMode] = useState<StreamMode>(() => {
    const savedSettings = loadSettings();
    return savedSettings.streamMode;
  });
  const [simpleQAMode, setSimpleQAMode] = useState<SimpleQAMode>(() => {
    const savedSettings = loadSettings();
    return savedSettings.simpleQAMode;
  });
  const [styleOptions, setStyleOptions] = useState<StyleOptions>(() => {
    const savedSettings = loadSettings();
    return savedSettings.styleOptions;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingReasoningContent, setStreamingReasoningContent] = useState('');
  const [reasoningStartTime, setReasoningStartTime] = useState(0);
  const [currentThinkingTime, setCurrentThinkingTime] = useState(0);
  const [streamComplete, setStreamComplete] = useState(false);
  const [showCompleteAnimation, setShowCompleteAnimation] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });
  // 使用函数式初始化，根据设备类型设置初始状态
  const [deviceType, setDeviceType] = useState<DeviceType>(() => getDeviceType());
  const [leftPanelOpen, setLeftPanelOpen] = useState(() => getDefaultPanelStates().leftOpen);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(() => getDefaultPanelStates().rightOpen);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('files');
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('unified');
  const [currentDiff, setCurrentDiff] = useState<DiffResult | null>(null);
  const [stagedFiles, setStagedFiles] = useState<ProjectFile[]>([]);
  const [leftWidth, setLeftWidth] = useState(256);
  const [rightWidth, setRightWidth] = useState(320);
  const justSwitchedConversation = useRef(false);
  const isLockedAtBottom = useRef(false);
  const isLoadingRef = useRef(false);
  const lastScrollTop = useRef(0);
  const leftResizerRef = useRef<HTMLDivElement>(null);
  const rightResizerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);
  const conversationListRef = useRef<ConversationListRef>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedElementRef = useRef<HTMLElement | null>(null);
  const {showScrollBottomButton, setShowScrollBottomButton} = useScrollStore();
  const [draftConversation, setDraftConversation] = useState<Conversation | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  // 获取当前对话
  const currentConversation = draftConversation?.id === currentConversationId
    ? (conversations.find(c => c.id === currentConversationId) || draftConversation)
    : conversations.find(c => c.id === currentConversationId);

  // 检查是否在底部的函数（距离底部300px认为在底部）
  const checkIsAtBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const {scrollTop, scrollHeight, offsetHeight} = container;
    // 距离底部小于300px，认为在底部
    const isAtBottom = scrollTop + offsetHeight > scrollHeight - 300;
    setShowScrollBottomButton(!isAtBottom);
  }, [setShowScrollBottomButton]);

  // 滚动到底部的函数
  const scrollToBottom = useCallback((event?: string) => {
    const container = chatContainerRef.current;
    if (container) {
      event?.slice(); // 事件参数处理
      container.scrollTop = container.scrollHeight;
      // 滚动到底部时，锁定在底部
      isLockedAtBottom.current = true;
    }
  }, []);

  // 订阅滚动事件
  useEffect(() => {
    const handleScrollEvent = (event: any) => {
      const {method} = event;
      if (method === 'clickButtonToScrollToBottom' || method === 'forceScrollToBottomTrigger') {
        scrollToBottom(method);
      }
    };
    const unsubscribe = scrollEventBus.subscribe(handleScrollEvent);
    return unsubscribe;
  }, [scrollToBottom]);

  // 滚动时更新状态
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const {scrollTop, scrollHeight, offsetHeight} = container;
    const distanceToBottom = scrollHeight - scrollTop - offsetHeight;

    // 流式输出期间的特殊处理：只检测用户的主动向上滚动
    if (isLoadingRef.current) {
      // 判断是否用户主动向上滚动（scrollTop 减小）
      const isUserScrollingUp = scrollTop < lastScrollTop.current;

      if (isUserScrollingUp) {
        // 用户向上滚动，退出底部锁定
        isLockedAtBottom.current = false;
      } else if (distanceToBottom < 300 && !isLockedAtBottom.current) {
        // 如果用户滚回底部附近（距离<300px），重新锁定
        isLockedAtBottom.current = true;
      }

      lastScrollTop.current = scrollTop;
      return;
    }

    // 非流式输出期间的正常逻辑
    lastScrollTop.current = scrollTop;
    checkIsAtBottom();
  }, [checkIsAtBottom]);

  // 监听滚动事件
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 监听窗口大小变化，更新设备类型
  useEffect(() => {
    const handleResize = () => {
      const newDeviceType = getDeviceType();
      setDeviceType(prev => {
        if (prev !== newDeviceType) {
          // 设备类型改变时，更新面板状态
          const defaultStates = getDefaultPanelStates();
          setLeftPanelOpen(defaultStates.leftOpen);
          setRightPanelOpen(defaultStates.rightOpen);
          // 如果从移动端切换到其他设备，关闭移动菜单
          if (prev === 'mobile' && newDeviceType !== 'mobile') {
            setMobileMenuOpen(false);
          }
        }
        return newDeviceType;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 页面加载完成后聚焦输入框，并滚动到底部
  useEffect(() => {
    setTimeout(() => {
      chatInputRef.current?.focus();
      scrollToBottom();
    }, 100);
  }, [scrollToBottom]);

  // 保存设置到本地存储
  useEffect(() => {
    saveSettings({
      model,
      styleOptions,
      simpleQAMode,
      streamMode
    });
  }, [model, styleOptions, simpleQAMode, streamMode]);

  // 保存数据
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  // 当切换会话时，清空选中的文件并滚动到底部
  useEffect(() => {
    if (currentConversation) {
      // 如果切换到的不是草稿对话，清空草稿
      if (draftConversation && draftConversation.id !== currentConversationId) {
        setDraftConversation(null);
      }

      // 只在不正在发送消息时才加载会话的文件列表
      if (!isLoadingRef.current) {
        setProjectFiles(currentConversation.projectFiles || []);
      }

      setSelectedFile(null);
      // 保存当前会话ID
      saveCurrentConversationId(currentConversationId);
      // 标记刚刚切换了会话
      justSwitchedConversation.current = true;
      // 取消底部锁定
      isLockedAtBottom.current = false;
      // 重置上次滚动位置
      lastScrollTop.current = 0;
      // 切换会话时滚动到底部
      requestAnimationFrame(() => {
        scrollToBottom();
      });
      // 延迟重置标志，避免自动滚动到底部
      setTimeout(() => {
        justSwitchedConversation.current = false;
      }, 100);
    }
  }, [currentConversationId, scrollToBottom, draftConversation]);

  // 保存当前会话的文件到本地存储
  useEffect(() => {
    // 只有当前对话不是草稿时，才更新 conversations
    if (currentConversationId && conversations.length > 0 && (!draftConversation || draftConversation.id !== currentConversationId)) {
      setConversations(prev => prev.map(c => {
        if (c.id === currentConversationId) {
          return {...c, projectFiles};
        }
        return c;
      }));
    }
  }, [projectFiles, currentConversationId, draftConversation, conversations.length]);

  // 自动滚动到底部
  useEffect(() => {
    // 如果刚切换了会话，不自动滚动到底部
    if (justSwitchedConversation.current) {
      return;
    }
    // 流式输出期间，只在锁定状态时滚动
    if (isLoadingRef.current) {
      if (isLockedAtBottom.current) {
        requestAnimationFrame(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        });
      }
      return;
    }
    // 非流式输出期间的正常逻辑：检查是否在底部
    checkIsAtBottom();
  }, [currentConversation?.messages, streamingContent, streamingReasoningContent, checkIsAtBottom]);

  // 左侧分隔条拖拽
  useEffect(() => {
    const resizer = leftResizerRef.current;
    if (!resizer) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = leftWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startX;
        const newWidth = Math.max(150, Math.min(400, startWidth + diff));
        setLeftWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    resizer.addEventListener('mousedown', handleMouseDown);
    return () => resizer.removeEventListener('mousedown', handleMouseDown);
  }, [leftWidth]);

  // 右侧分隔条拖拽
  useEffect(() => {
    const resizer = rightResizerRef.current;
    if (!resizer) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = rightWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const diff = startX - e.clientX;
        const newWidth = Math.max(200, Math.min(500, startWidth + diff));
        setRightWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    resizer.addEventListener('mousedown', handleMouseDown);
    return () => resizer.removeEventListener('mousedown', handleMouseDown);
  }, [rightWidth]);

  // 创建新对话
  const createNewConversation = useCallback(() => {
    // 检查是否已存在空的草稿对话
    if (draftConversation) {
      setCurrentConversationId(draftConversation.id);
      // 聚焦输入框
      setTimeout(() => chatInputRef.current?.focus(), 0);
      // 移动端时关闭菜单
      if (deviceType === 'mobile') {
        setMobileMenuOpen(false);
      }
      return;
    }

    const newConversation: Conversation = {
      id: generateId(),
      title: '新对话',
      messages: [],
      model,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectFiles: []
    };
    setDraftConversation(newConversation);
    setCurrentConversationId(newConversation.id);
    // 聚焦输入框
    setTimeout(() => chatInputRef.current?.focus(), 0);
    // 移动端时关闭菜单
    if (deviceType === 'mobile') {
      setMobileMenuOpen(false);
    }
  }, [draftConversation, model, deviceType]);

  // 选择会话（移动端时关闭菜单）
  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
    // 移动端时关闭菜单
    if (deviceType === 'mobile') {
      setMobileMenuOpen(false);
    }
  }, [deviceType]);

  // 删除对话
  const deleteConversation = useCallback((id: string) => {
    const remaining = conversations.filter(c => c.id !== id);
    setConversations(remaining);

    if (currentConversationId === id) {
      const newCurrentId = remaining.length > 0 ? remaining[0].id : null;
      setCurrentConversationId(newCurrentId);
      // 保存新的当前会话ID
      saveCurrentConversationId(newCurrentId);
    }
  }, [currentConversationId, conversations]);

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    // 如果没有内容且没有暂存文件，直接返回
    if (!content.trim() && stagedFiles.length === 0) return;

    // 立即保存暂存文件到本地变量并清空，这样UI会立即隐藏暂存文件显示区域
    const currentStagedFiles = [...stagedFiles];
    setStagedFiles([]);

    // 上传图像文件到OSS
    const imageFiles = currentStagedFiles.filter(f => f.type === 'image');
    let uploadedImageUrls: string[] = [];

    if (imageFiles.length > 0) {
      try {
        // 逐个上传图像文件
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          try {
            const fileObj = currentStagedFiles.find(f => f.id === file.id);
            if (fileObj && fileObj.previewUrl) {
              // 从预览URL创建File对象
              const response = await fetch(fileObj.previewUrl);
              const blob = await response.blob();
              const fileToUpload = new File([blob], file.name, {type: blob.type});

              const url = await uploadFileToOSS(fileToUpload);
              uploadedImageUrls.push(url);
            }
          } catch (error) {
            console.error(`上传文件 ${file.name} 失败:`, error);
          }
        }
      } catch (error) {
        console.error('上传图像文件失败:', error);
      }
    }

    // 构建消息内容
    let messageContent: string | MessageContent[];
    const codeFiles = currentStagedFiles.filter(f => f.type === 'code');

    if (uploadedImageUrls.length > 0) {
      // 有图像文件，使用数组格式
      const contentArray: MessageContent[] = [];

      // 添加文本内容
      let textContent = content.trim();
      if (!textContent) {
        // 如果没有文本内容，生成默认文本
        if (codeFiles.length > 0) {
          textContent = `请分析以下文件：\n\n代码文件:\n${codeFiles.map(f => f.name).join('\n')}`;
        } else {
          textContent = '请分析图片';
        }
      }

      contentArray.push({
        type: 'text',
        text: textContent
      });

      // 添加图像URL
      uploadedImageUrls.forEach(url => {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: url
          }
        });
      });

      messageContent = contentArray;
    } else {
      // 没有图像文件，使用字符串格式
      const codeFilesText = codeFiles.length > 0
        ? `\n\n代码文件:\n${codeFiles.map(f => f.name).join('\n')}`
        : '';
      messageContent = content.trim() || `请分析以下文件：${codeFilesText}`;
    }

    // 确保有当前对话
    let convId = currentConversationId;
    let isDraft = false;

    let existingMessages: Message[] = [];
    let titleGenerationTriggered = false; // 标记是否已触发标题生成
    let aiStreamedContent = ''; // 用于追踪AI流式输出的内容

    if (!convId) {
      const newConv: Conversation = {
        id: generateId(),
        title: messageContent.slice(0, 30) + (messageContent.length > 30 ? '...' : ''),
        messages: [],
        model,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setConversations(prev => [newConv, ...prev]);
      convId = newConv.id;
      setCurrentConversationId(convId);
    } else if (draftConversation && draftConversation.id === convId) {
      isDraft = true;
      existingMessages = draftConversation.messages;
      // 如果是草稿对话，添加到 conversations
      const convToAdd: Conversation = {
        ...draftConversation,
        title: messageContent.slice(0, 30) + (messageContent.length > 30 ? '...' : ''),
        updatedAt: new Date()
      };
      setConversations(prev => [convToAdd, ...prev]);
    } else {
      const conv = conversations.find(c => c.id === convId);
      existingMessages = conv?.messages || [];
    }

    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setIsLoading(true);
    isLoadingRef.current = true;
    isLockedAtBottom.current = true; // 在更新消息前设置锁定
    lastScrollTop.current = chatContainerRef.current?.scrollTop || 0; // 重置滚动位置

    // 添加用户消息到 conversations
    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        // 生成标题文本
        let titleText: string;
        if (typeof messageContent === 'string') {
          titleText = messageContent;
        } else {
          // 如果是数组格式，提取文本内容
          const textItem = messageContent.find(item => item.type === 'text');
          titleText = textItem?.text || '图片分析';
        }

        return {
          ...c,
          messages: [...c.messages, userMessage],
          updatedAt: new Date(),
          title: c.messages.length === 0 ? titleText.slice(0, 30) + (titleText.length > 30 ? '...' : '') : c.title
        };
      }
      return c;
    }));

    setStreamingContent('');

    // 构建消息历史
    const messageHistory = [
      ...existingMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      {role: 'user', content: messageContent}
    ];
    console.log('发送的消息历史:', JSON.stringify(messageHistory, null, 2));

    // 添加暂存文件到项目文件
    if (currentStagedFiles.length > 0) {
      setProjectFiles(prev => [...prev, ...currentStagedFiles]);

      // 区分图像文件和代码文件
      const imageFiles = currentStagedFiles.filter(f => f.type === 'image' && f.imageUrl);
      const codeFiles = currentStagedFiles.filter(f => f.type === 'code');

      // 构建文件上下文
      let filesContext = '';

      if (imageFiles.length > 0) {
        filesContext += `图像文件:\n${imageFiles.map(f => `- ${f.name}: ${f.imageUrl}`).join('\n')}\n\n`;
      }

      if (codeFiles.length > 0) {
        filesContext += `代码文件:\n${codeFiles.map(f => `文件: ${f.name}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n')}`;
      }

      if (filesContext) {
        messageHistory.unshift({
          role: 'system',
          content: `用户上传了以下文件:\n\n${filesContext}\n请分析这些文件内容并回答用户的问题。`
        });
      }
    }

    // 添加项目文件上下文（排除刚添加的暂存文件）
    const allProjectFiles = [...projectFiles, ...currentStagedFiles];
    if (allProjectFiles.length > currentStagedFiles.length && responseMode === 'code') {
      const filesContext = projectFiles.map(f => `文件: ${f.name}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n');
      messageHistory.unshift({
        role: 'system',
        content: `当前项目包含以下文件:\n\n${filesContext}\n\n请根据这些文件的上下文回答问题或修改代码。`
      });
    }

    // 添加风格选项（仅在代码生成模式）
    if (responseMode === 'code') {
      const stylePrompt = `代码风格要求: ${styleOptions.codeStyle}风格, ${styleOptions.commentLevel === 'full' ? '详细注释' : styleOptions.commentLevel === 'minimal' ? '简洁注释' : '不需要注释'}, 使用${styleOptions.indentation === 'auto' ? '智能' : styleOptions.indentation === 'spaces2' ? '2空格' : styleOptions.indentation === 'spaces4' ? '4空格' : 'Tab'}缩进`;
      messageHistory.push({role: 'system', content: stylePrompt});
    }

    try {
      // 重置状态
      setStreamComplete(false);
      setShowCompleteAnimation(false);
      setStreamingContent('');
      setStreamingReasoningContent('');
      setReasoningStartTime(0);
      setCurrentThinkingTime(0);

      // 根据流式输出模式决定是否使用回调
      const useStream = streamMode === 'stream';
      const streamCallback = useStream ? (chunk: string) => {
        setStreamingContent(prev => prev + chunk);
        aiStreamedContent += chunk;

        // 在AI流式输出达到200-300字符时触发标题生成（仅对新对话）
        if (!titleGenerationTriggered && existingMessages.length === 0 && aiStreamedContent.length >= 200 && aiStreamedContent.length <= 300) {
          titleGenerationTriggered = true;
          // 处理messageContent可能是数组格式的情况
          let userText: string;
          if (typeof messageContent === 'string') {
            userText = messageContent;
          } else {
            // 提取文本内容
            const textItem = messageContent.find(item => item.type === 'text');
            userText = textItem?.text || '图片分析';
          }
          const conversationText = `用户: ${userText}\n\nAI: ${aiStreamedContent}`;

          generateConversationTitle(conversationText)
          .then(title => {
            setConversations(prev => prev.map(c => {
              if (c.id === convId) {
                return {...c, title};
              }
              return c;
            }));
          })
          .catch(error => {
            console.error('生成标题失败:', error);
          });
        }
      } : undefined;

      const reasoningStreamCallback = useStream ? (chunk: string) => {
        // 第一次收到思考内容时，记录开始时间
        setReasoningStartTime(prev => prev === 0 ? Date.now() : prev);
        setStreamingReasoningContent(prev => prev + chunk);
      } : undefined;

      const reasoningCompleteCallback = useStream ? () => {
        // 思考完成，立即计算并更新思考时间
        console.log('reasoningCompleteCallback 被调用');
        setReasoningStartTime(startTime => {
          if (startTime > 0) {
            const thinkingTime = Math.round((Date.now() - startTime) / 1000);
            console.log('计算思考时间:', thinkingTime, '秒');
            setCurrentThinkingTime(currentTime => {
              if (currentTime === 0) {
                console.log('更新 currentThinkingTime 从', currentTime, '到', thinkingTime);
                return thinkingTime;
              }
              return currentTime;
            });
          }
          return startTime;
        });
      } : undefined;

      const response = await callAI(
        messageHistory,
        model,
        streamCallback,
        reasoningStreamCallback,
        reasoningCompleteCallback,
        useStream,
        responseMode,
        responseMode === 'simple' ? simpleQAMode : undefined
      );

      // 标记流结束，显示完成动画
      setStreamComplete(true);
      setShowCompleteAnimation(true);

      if (response.success && response.content) {
        // 提取代码块
        const codeBlocks = extractCodeBlocks(response.content);

        // 计算每个代码块在contentParts中的实际索引
        // 使用与 ChatMessage 中 parseCodeBlocks 相同的解析逻辑
        const parts: { type: 'text' | 'code' }[] = [];
        const codeBlockIndices: number[] = [];
        parseContentParts(response.content, parts, codeBlockIndices, false);

        const assistantMessageId = generateId();
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          reasoning_content: response.reasoning_content,
          thinking_time: response.thinking_time,
          model: model,
          codeBlocks: codeBlocks.map((block, index) => ({
            id: `${assistantMessageId}-${codeBlockIndices[index]}`,
            ...block
          }))
        };

        // 将生成的代码片段自动加入到文件列表
        if (codeBlocks.length > 0) {
          // 计算当前已有的最大code_xx序号
          const getMaxCodeIndex = (files: ProjectFile[]): number => {
            let maxIndex = 0;
            files.forEach(file => {
              const match = file.name.match(/^code_(\d+)\.\w+$/);
              if (match) {
                const index = parseInt(match[1], 10);
                if (index > maxIndex) {
                  maxIndex = index;
                }
              }
            });
            return maxIndex;
          };

          let currentMaxIndex = getMaxCodeIndex(projectFiles);

          const newFiles: ProjectFile[] = codeBlocks.map((block, index) => {
            const language = block.language || 'plaintext';
            let filename: string;
            if (block.filename) {
              filename = block.filename;
            } else {
              currentMaxIndex++;
              filename = `code_${currentMaxIndex}.${getExtensionFromLanguage(language)}`;
            }
            const anchorId = `${assistantMessageId}-${codeBlockIndices[index]}`;
            console.log(`Creating file with anchorId: ${anchorId}, filename: ${filename}, codeBlockIndex: ${index}, partIndex: ${codeBlockIndices[index]}`);

            return {
              id: generateId(),
              name: filename,
              path: filename,
              content: block.code,
              language: language,
              originalContent: block.code,
              history: [],
              anchorId: anchorId
            };
          });

          setProjectFiles(prev => [...prev, ...newFiles]);

          // 立即更新当前会话的文件列表，避免触发会话更新导致重新加载
          setConversations(prev => prev.map(c => {
            if (c.id === convId) {
              return {...c, projectFiles: [...(c.projectFiles || []), ...newFiles]};
            }
            return c;
          }));
        }

        // 添加助手消息到 conversations
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            return {
              ...c,
              messages: [...c.messages, assistantMessage],
              updatedAt: new Date()
            };
          }
          return c;
        }));
      } else {
        // 错误消息
        const errorMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: `抱歉，生成失败: ${response.error || '未知错误'}`,
          timestamp: new Date(),
          model: model
        };

        // 添加错误消息到 conversations
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            return {
              ...c,
              messages: [...c.messages, errorMessage],
              updatedAt: new Date()
            };
          }
          return c;
        }));
      }
    } catch (error) {
      console.error('API调用失败:', error);
      setStreamComplete(true);
      setShowCompleteAnimation(true);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      // 流式输出完成后，强制滚动到底部
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      });
      // 流式输出结束，取消锁定
      isLockedAtBottom.current = false;
      setStreamingContent('');
      setStreamingReasoningContent('');
      setReasoningStartTime(0);
      setCurrentThinkingTime(0);
      // 仅隐藏完成动画，不隐藏生成完成状态指示器（它会一直显示直到下一次生成）
      setTimeout(() => {
        setShowCompleteAnimation(false);
      }, 3000);
      // 释放图像预览URL
      currentStagedFiles.forEach(file => {
        if (file.type === 'image' && file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
      // 如果是草稿对话，清空草稿
      if (isDraft) {
        setDraftConversation(null);
      }
    }
  }, [currentConversationId, conversations, draftConversation, model, projectFiles, stagedFiles, styleOptions, responseMode, streamMode, simpleQAMode]);

  // 处理文件上传 - 暂存文件
  const handleFileUpload = useCallback(async (files: FileList) => {
    const newFiles: ProjectFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (isImageFile(file)) {
        // 图像文件：创建预览URL，标记为待上传
        const previewUrl = URL.createObjectURL(file);
        newFiles.push({
          id: generateId(),
          name: file.name,
          path: file.name,
          content: '',
          language: 'image',
          originalContent: '',
          history: [],
          type: 'image',
          previewUrl,
          uploadProgress: 0,
          uploadStatus: 'pending'
        });
      } else if (isCodeFile(file)) {
        // 代码文件：读取内容
        const content = await file.text();
        const extension = file.name.split('.').pop() || '';
        const language = detectLanguage(content) || getLanguageFromExtension(extension);

        newFiles.push({
          id: generateId(),
          name: file.name,
          path: file.name,
          content,
          language,
          originalContent: content,
          history: [],
          type: 'code'
        });
      }
    }

    // 暂存文件，等待用户发送消息时一起提交
    setStagedFiles(prev => [...prev, ...newFiles]);
  }, []);

  // 移除暂存的文件
  const removeStagedFile = useCallback((fileId: string) => {
    setStagedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.type === 'image' && fileToRemove.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  // 从扩展名获取语言
  const getLanguageFromExtension = (ext: string): string => {
    const map: { [key: string]: string } = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', java: 'java', go: 'go', rs: 'rust',
      html: 'html', css: 'css', json: 'json', sql: 'sql',
      md: 'markdown', txt: 'plaintext'
    };
    return map[ext] || 'plaintext';
  };

  // 跳转到指定的锚点
  const jumpToAnchor = useCallback((anchorId: string) => {
    console.log('jumpToAnchor called with anchorId:', anchorId);

    // 清除之前的高亮效果
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove('ring-2', 'ring-blue-500');
      highlightedElementRef.current = null;
    }

    const element = document.getElementById(anchorId);
    // console.log('Found element:', element);

    if (element) {
      const container = chatContainerRef.current;
      // console.log('Chat container:', container);

      if (container) {
        // 计算元素在容器中的位置
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollTop = container.scrollTop;
        const offsetTop = elementRect.top - containerRect.top + scrollTop - container.clientHeight / 2 + elementRect.height / 2;

        console.log('Scrolling to:', offsetTop);

        // 平滑滚动到目标位置
        container.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });

        // 添加高亮效果
        element.classList.add('ring-2', 'ring-blue-500');
        highlightedElementRef.current = element;
        highlightTimeoutRef.current = setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500');
          highlightTimeoutRef.current = null;
          highlightedElementRef.current = null;
        }, 2000);
      } else {
        console.log('Chat container not found, using scrollIntoView');
        // 降级方案：使用scrollIntoView
        element.scrollIntoView({behavior: 'smooth', block: 'center'});
        element.classList.add('ring-2', 'ring-blue-500');
        highlightedElementRef.current = element;
        highlightTimeoutRef.current = setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500');
          highlightTimeoutRef.current = null;
          highlightedElementRef.current = null;
        }, 2000);
      }
    } else {
      console.log('Element not found with id:', anchorId);
    }
  }, []);

  // 应用代码到项目 - 使用最新版本进行比较
  const applyCode = useCallback((codeBlock: CodeBlock) => {
    // 如果有选中的文件，使用选中文件的当前内容进行比较
    if (selectedFile) {
      const diff = calculateDiff(selectedFile.content, codeBlock.code, selectedFile.name);
      setCurrentDiff(diff);
      setRightPanelTab('diff');
      setRightPanelOpen(true);

      // 添加到历史记录并更新内容
      const updatedFile = addFileHistory(selectedFile, codeBlock.code, 'AI生成的修改');
      setProjectFiles(prev => prev.map(f => f.id === selectedFile.id ? updatedFile : f));

      // 自动选中最新版本
      setSelectedFile(updatedFile);
      return;
    }

    // 如果没有选中文件，检查是否有同名文件
    const filename = codeBlock.filename || `code.${getExtensionFromLanguage(codeBlock.language)}`;
    const existingFile = projectFiles.find(f => f.name === filename);

    if (existingFile) {
      // 与当前内容比较（最新版本）
      const diff = calculateDiff(existingFile.content, codeBlock.code, filename);
      setCurrentDiff(diff);
      setRightPanelTab('diff');
      setRightPanelOpen(true);

      // 添加到历史记录并更新内容
      const updatedFile = addFileHistory(existingFile, codeBlock.code, 'AI生成的修改');
      setProjectFiles(prev => prev.map(f => f.id === existingFile.id ? updatedFile : f));

      // 自动选中最新版本
      setSelectedFile(updatedFile);
    } else {
      // 创建新文件
      const newFile: ProjectFile = {
        id: generateId(),
        name: filename,
        path: filename,
        content: codeBlock.code,
        language: codeBlock.language,
        originalContent: codeBlock.code,
        history: [],
        anchorId: codeBlock.id
      };
      setProjectFiles(prev => [...prev, newFile]);
      setSelectedFile(newFile);

      // 对于新文件，显示与空内容的对比
      const diff = calculateDiff('', codeBlock.code, filename);
      setCurrentDiff(diff);
      setRightPanelTab('diff');
      setRightPanelOpen(true);
    }
  }, [selectedFile, projectFiles]);

  // 从语言获取扩展名
  const getExtensionFromLanguage = (lang: string): string => {
    const map: { [key: string]: string } = {
      javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
      go: 'go', rust: 'rs', html: 'html', css: 'css', json: 'json', sql: 'sql',
      js: 'js', jsx: 'jsx', ts: 'ts', tsx: 'tsx', markdown: 'md', plaintext: 'txt',
      bash: 'sh', yaml: 'yaml', yml: 'yaml', xml: 'xml', vue: 'vue',
      csharp: 'cs', r: 'r', sh: 'sh', shell: 'sh', shellscript: 'sh',
      c: 'c', cpp: 'cpp', php: 'php', kotlin: 'kt', swift: 'swift',
      ruby: 'rb', rb: 'rb', scala: 'scala', dart: 'dart',
      perl: 'pl', lua: 'lua', powershell: 'ps1', posh: 'ps1', graphql: 'graphql',
      gql: 'graphql', toml: 'toml', diff: 'diff', scss: 'scss',
      sass: 'sass', less: 'less', groovy: 'groovy', 'objective-c': 'm', objc: 'm',
      mysql: 'sql', postgresql: 'sql', ini: 'ini', conf: 'conf', nginx: 'conf'
    };
    return map[lang] || 'txt';
  };

  // 删除文件
  const deleteFile = useCallback((fileId: string) => {
    setProjectFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  }, [selectedFile]);

  // 恢复历史版本
  const restoreHistory = useCallback((file: ProjectFile, history: FileHistory) => {
    const diff = calculateDiff(file.content, history.content, file.name);
    setCurrentDiff(diff);
    setRightPanelTab('diff');

    const updatedFile: ProjectFile = {
      ...file,
      content: history.content,
      history: [...file.history, {
        id: generateId(),
        timestamp: new Date(),
        content: file.content,
        description: '恢复到历史版本前的状态'
      }]
    };

    setProjectFiles(prev => prev.map(f => f.id === file.id ? updatedFile : f));
    setSelectedFile(updatedFile);
  }, []);

  // 导出功能
  const handleExportPdf = useCallback(() => {
    if (!currentConversation) {
      alert('没有对话内容可导出');
      return;
    }
    const content = currentConversation.messages
    .map(m => `[${m.role === 'user' ? '用户' : 'AI'}]\n${m.content}`)
    .join('\n\n---\n\n');
    try {
      exportAsPdf(content, currentConversation.title);
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('导出失败，请稍后重试');
    }
  }, [currentConversation]);

  const handleExportImage = useCallback(async () => {
    if (!chatContainerRef.current) {
      alert('无法找到对话容器');
      return;
    }
    const filename = currentConversation?.title || 'conversation';
    try {
      await exportConversationImage(chatContainerRef.current, filename);
    } catch (error) {
      console.error('图片导出失败:', error);
      alert('导出失败，请稍后重试');
    }
  }, [currentConversation]);

  // 主题切换
  const handleToggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newIsDark = !prev;
      // 保存到 localStorage
      localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
      return newIsDark;
    });
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div
      className={`h-[100dvh] flex overflow-hidden ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* 移动端遮罩层 */}
      {deviceType === 'mobile' && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 左侧边栏 - 对话列表 */}
      <div
        className={`overflow-hidden flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${
          deviceType === 'mobile'
            ? `fixed left-0 top-0 h-full z-50 rounded-tr-[20px] ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`
            : 'mt-2 rounded-tr-[20px]'
        } ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}
        style={{
          width: deviceType === 'mobile'
            ? (mobileMenuOpen ? `${leftWidth}px` : '0px')
            : (leftPanelOpen ? (leftPanelCollapsed ? '64px' : `${leftWidth}px`) : '0px')
        }}
      >
        {/* Logo区域 */}
        <div className="h-14 flex items-center justify-between px-3 pt-4">
          <div className="flex items-center gap-3">
            {!leftPanelCollapsed ? (
              <div
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 cursor-pointer"
                onClick={() => window.location.reload()}
              >
                <Code2 size={20} className="text-white"/>
              </div>
            ) : (
              <div
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 cursor-pointer group"
                onClick={() => setLeftPanelCollapsed(false)}
              >
                <Code2 size={20} className="text-white opacity-100 group-hover:opacity-0 transition-opacity"/>
                <PanelLeftClose size={20}
                                className="absolute text-white opacity-0 group-hover:opacity-100 transition-opacity rotate-180"/>
              </div>
            )}
            {!leftPanelCollapsed && (
              <div className="min-w-0 cursor-pointer" onClick={() => window.location.reload()}>
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AiCoder</h1>
                <p className={`text-xs -mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>智能创作平台</p>
              </div>
            )}
          </div>
          {!leftPanelCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLeftPanelCollapsed(true);
              }}
              className={`p-1.5 rounded transition-colors ${deviceType === 'mobile' ? 'hidden' : ''} ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
              title="收起侧边栏"
            >
              <PanelLeftClose size={18}/>
            </button>
          )}
        </div>

        {/* 收起状态：只显示图标 */}
        {leftPanelCollapsed && (
          <div className="flex flex-col items-center gap-4 py-4">
            <button
              onClick={() => {
                setLeftPanelCollapsed(false);
                createNewConversation();
              }}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
              title="新建对话"
            >
              <Plus size={20}/>
            </button>
            <button
              onClick={() => {
                setLeftPanelCollapsed(false);
                setTimeout(() => conversationListRef.current?.focusSearch(), 100);
              }}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
              title="搜索对话"
            >
              <SearchIcon size={20}/>
            </button>
          </div>
        )}

        {/* 展开状态：显示完整列表 */}
        {!leftPanelCollapsed && (
          <ConversationList
            ref={conversationListRef}
            conversations={conversations}
            currentId={currentConversationId}
            onSelect={handleSelectConversation}
            onNew={createNewConversation}
            onDelete={deleteConversation}
            isDark={isDark}
          />
        )}
      </div>

      {/* 左侧分隔条 */}
      {deviceType !== 'mobile' && leftPanelOpen && !leftPanelCollapsed && (
        <div
          ref={leftResizerRef}
          className={`px-0 cursor-col-resize hover:bg-transparent transition-colors flex-shrink-0 ${isDark ? 'bg-transparent' : 'bg-gray-200'}`}
        />
      )}

      {/* 中间区域 - 聊天 */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* 移动端Header */}
        {deviceType === 'mobile' && (
          <div
            className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
              title="菜单"
            >
              <Menu size={20}/>
            </button>
            <h1 className={`text-base max-w-[200px] truncate ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
              {currentConversation?.title || 'AiCoder'}
            </h1>
            <div className="w-9"/>
            {/* 占位符，保持标题居中 */}
          </div>
        )}

        {/* 聊天消息区 */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto pb-32">
          {currentConversation?.messages.map(message => (
            <ChatMessage
              key={message.id}
              message={message}
              onApplyCode={applyCode}
              onCopyCode={copyToClipboard}
              isDark={isDark}
            />
          ))}

          {/* 流式输出显示 */}
          {isLoading && (streamingContent || streamingReasoningContent) && (
            <>
              <ChatMessage
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: new Date(),
                  reasoning_content: streamingReasoningContent,
                  thinking_time: currentThinkingTime
                }}
                isDark={isDark}
              />
            </>
          )}

          {/* 空状态 */}
          {!currentConversation && (
            <div className="h-full flex items-center justify-center">
              <div className={`text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50"/>
                <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>欢迎使用
                  AiCoder</h3>
                <p className="text-sm mb-4">智能代码生成 · 多轮对话优化 · 差异化对比</p>
                <button
                  onClick={createNewConversation}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  开始新对话
                </button>
              </div>
            </div>
          )}

          {/* 滚动到底部按钮 */}
          {showScrollBottomButton && currentConversation && (
            <div className="absolute right-4 bottom-36">
              <button
                onClick={() => {
                  scrollEventBus.next({
                    method: 'clickButtonToScrollToBottom',
                    args: null
                  });
                }}
                className={`${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-400 hover:bg-gray-500'} text-white dark:text-white light:text-gray-900 p-2 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 sm:p-2.5`}
                title="滚动到底部"
              >
                <ChevronDown size={20}/>
              </button>
            </div>
          )}
        </div>

        {/* 输入区 */}
        <ChatInput
          ref={chatInputRef}
          onSend={sendMessage}
          onSendFiles={() => sendMessage('')}
          onFileUpload={handleFileUpload}
          onRemoveStagedFile={removeStagedFile}
          stagedFiles={stagedFiles}
          model={model}
          onModelChange={setModel}
          styleOptions={styleOptions}
          onStyleChange={setStyleOptions}
          isLoading={isLoading}
          responseMode={responseMode}
          onResponseModeChange={setResponseMode}
          streamMode={streamMode}
          onStreamModeChange={setStreamMode}
          simpleQAMode={simpleQAMode}
          onSimpleQAModeChange={setSimpleQAMode}
          streamComplete={streamComplete}
          isDark={isDark}
        />
      </div>

      {/* 右侧分隔条 */}
      {deviceType !== 'mobile' && rightPanelOpen && !rightPanelCollapsed && (
        <div
          ref={rightResizerRef}
          className={`px-0 cursor-col-resize hover:bg-blue-500 transition-colors flex-shrink-0 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
        />
      )}

      {/* 右侧边栏 - 文件和差异 */}
      {deviceType !== 'mobile' && (
        <div
          className={`${rightPanelOpen ? 'overflow-hidden' : 'w-0 overflow-hidden'} border-l flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
          style={{width: rightPanelOpen ? (rightPanelCollapsed ? '64px' : `${rightWidth}px`) : '0px'}}
        >
          {/* 收起状态：只显示图标 */}
          {rightPanelCollapsed && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div
                className={`flex p-2 rounded-lg items-center justify-center flex-shrink-0 cursor-pointer group relative text-gray-300 ${isDark ? 'hover:text-white hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                onClick={() => setRightPanelCollapsed(false)}
              >
                <PanelRightClose size={20}
                                 className=" rounded-lg opacity-100 transition-opacity rotate-180"/>
                {/*<PanelRightClose size={20}*/}
                {/*                 className="absolute text-white opacity-0 group-hover:opacity-100 transition-opacity rotate-180"/>*/}
              </div>
              <button
                onClick={() => setRightPanelTab('files')}
                className={`p-2 rounded-lg transition-colors ${rightPanelTab === 'files' ? 'bg-blue-500/20 text-blue-400' : (isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200')}`}
                title="文件"
              >
                <FolderOpen size={20}/>
              </button>
              <button
                onClick={() => setRightPanelTab('diff')}
                className={`p-2 rounded-lg transition-colors ${rightPanelTab === 'diff' ? 'bg-blue-500/20 text-blue-400' : (isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200')}`}
                title="差异"
              >
                <GitCompare size={20}/>
              </button>
              <button
                onClick={handleExportImage}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                title="导出为图片"
              >
                <ImageIcon size={20}/>
              </button>
              <button
                onClick={handleExportPdf}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                title="导出 PDF"
              >
                <FileText size={20}/>
              </button>
              <button
                onClick={handleToggleTheme}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                title={isDark ? "切换到白天模式" : "切换到夜间模式"}
              >
                {isDark ? <Sun size={20}/> : <Moon size={20}/>}
              </button>
              <a
                href="https://github.com/rawchen/ai-coder"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                title="GitHub"
              >
                <Github size={20}/>
              </a>
            </div>
          )}

          {/* 展开状态：显示完整内容 */}
          {!rightPanelCollapsed && (
            <>
              {/* 功能按钮区 */}
              <div
                className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRightPanelCollapsed(true);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                  title="收起侧边栏"
                >
                  <PanelRightClose size={18}/>
                </button>
                <button
                  onClick={handleExportImage}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                  title="导出为图片"
                >
                  <ImageIcon size={18}/>
                  {/*<span>图片</span>*/}
                </button>

                <button
                  onClick={handleExportPdf}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                  title="导出 PDF"
                >
                  <FileText size={18}/>
                  {/*<span>PDF</span>*/}
                </button>

                <button
                  onClick={handleToggleTheme}
                  className={`flex items-center justify-center px-2 py-1.5 text-xs rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                  title={isDark ? "切换到白天模式" : "切换到夜间模式"}
                >
                  {isDark ? <Sun size={18}/> : <Moon size={18}/>}
                </button>

                <div className={`flex-1`}/>

                <a
                  href="https://github.com/rawchen/ai-coder"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                  title="GitHub"
                >
                  <Github size={18}/>
                </a>
              </div>

              {/* 标签页 */}
              <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setRightPanelTab('files')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm transition-colors ${
                    rightPanelTab === 'files'
                      ? `${isDark ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800' : 'text-blue-600 border-b-2 border-blue-600 bg-gray-100'}`
                      : `${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`
                  }`}
                >
                  <FolderOpen size={16}/>
                  文件
                </button>
                <button
                  onClick={() => setRightPanelTab('diff')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm transition-colors ${
                    rightPanelTab === 'diff'
                      ? `${isDark ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800' : 'text-blue-600 border-b-2 border-blue-600 bg-gray-100'}`
                      : `${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`
                  }`}
                >
                  <GitCompare size={16}/>
                  差异
                </button>
              </div>

              {/* 内容区 */}
              <div className="flex-1 overflow-y-auto">
                {rightPanelTab === 'files' ? (
                  <FileExplorer
                    files={projectFiles}
                    selectedFile={selectedFile}
                    onSelectFile={setSelectedFile}
                    onDeleteFile={deleteFile}
                    onRestoreHistory={restoreHistory}
                    isDark={isDark}
                    onJumpToAnchor={jumpToAnchor}
                  />
                ) : (
                  <div className="p-3">
                    {/* 差异视图切换按钮 */}
                    <div className="flex items-center justify-end mb-3">
                      <button
                        onClick={() => setDiffViewMode(prev => prev === 'split' ? 'unified' : 'split')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        <GitCompare size={14}/>
                        {diffViewMode === 'split' ? '分栏视图' : '统一视图'}
                      </button>
                    </div>
                    {currentDiff ? (
                      <DiffViewer diff={currentDiff} viewMode={diffViewMode} isDark={isDark}/>
                    ) : (
                      <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <GitCompare size={40} className="mx-auto mb-2 opacity-50"/>
                        <p className="text-sm">暂无差异对比</p>
                        <p className="text-xs mt-1">应用代码修改后将显示差异</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>

  );
}

export default App;