import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Header,
  ChatInput,
  ChatInputRef,
  ChatMessage,
  FileExplorer,
  ConversationList,
  DiffViewer
} from './components';
import {
  Message,
  Conversation,
  ProjectFile,
  ModelType,
  StyleOptions,
  CodeBlock,
  DiffResult,
  FileHistory,
  ResponseMode,
  StreamMode,
  SimpleQAMode
} from './types';
import { callAI, analyzeProjectFiles, extractCodeBlocks, detectLanguage } from './services/api';
import { saveConversations, loadConversations, saveProjectFiles, loadProjectFiles, saveSettings, loadSettings, generateId, addFileHistory, saveCurrentConversationId, loadCurrentConversationId } from './services/storage';
import { calculateDiff, exportAsZip, exportAsPdf, exportConversationImage, copyToClipboard } from './services/utils';
import { PanelLeftClose, PanelRightClose, FolderOpen, MessageSquare, GitCompare, File, X, Settings, ChevronUp, ChevronDown } from 'lucide-react';

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
    return { leftOpen: false, rightOpen: false };
  } else if (device === 'ipad') {
    return { leftOpen: true, rightOpen: false };
  }
  return { leftOpen: true, rightOpen: true };
};

function App() {
  // 状态
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const savedConversations = loadConversations();
    return savedConversations;
  });
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    const savedConversations = loadConversations();
    const savedCurrentId = loadCurrentConversationId();

    if (savedConversations.length > 0) {
      let targetId = savedCurrentId;
      // 如果保存的ID不存在于当前会话列表中，则使用第一个会话
      if (targetId && !savedConversations.find(c => c.id === targetId)) {
        targetId = savedConversations[0].id;
      } else if (!targetId) {
        targetId = savedConversations[0].id;
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
  const [autoScroll, setAutoScroll] = useState(true);
  // 使用函数式初始化，根据设备类型设置初始状态
  const [leftPanelOpen, setLeftPanelOpen] = useState(() => getDefaultPanelStates().leftOpen);
  const [rightPanelOpen, setRightPanelOpen] = useState(() => getDefaultPanelStates().rightOpen);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('files');
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('unified');
  const [currentDiff, setCurrentDiff] = useState<DiffResult | null>(null);
  const [stagedFiles, setStagedFiles] = useState<ProjectFile[]>([]);
  const [leftWidth, setLeftWidth] = useState(256);
  const [rightWidth, setRightWidth] = useState(320);
  const [scrollNavDirection, setScrollNavDirection] = useState<'up' | 'down' | null>(null);
  const justSwitchedConversation = useRef(false);
  const isScrollingByNav = useRef(false);
  const isLockedAtBottom = useRef(false);
  const isLoadingRef = useRef(false);
  const lastScrollTop = useRef(0);
  const leftResizerRef = useRef<HTMLDivElement>(null);
  const rightResizerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  // 获取当前对话
  const currentConversation = conversations.find(c => c.id === currentConversationId);

  // 页面加载完成后聚焦输入框，并滚动到底部
  useEffect(() => {
    setTimeout(() => {
      chatInputRef.current?.focus();
      // 滚动对话到底部
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  }, []);

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

  // 当切换会话时加载对应的文件
  useEffect(() => {
    if (currentConversation) {
      setProjectFiles(currentConversation.projectFiles || []);
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
      if (chatContainerRef.current) {
        const container = chatContainerRef.current;
        // 使用 requestAnimationFrame 确保 DOM 更新后再滚动
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
        // 检查内容是否可滚动，如果不可滚动则隐藏导航按钮
        const { scrollHeight, clientHeight } = container;
        const canScroll = scrollHeight > clientHeight;
        if (!canScroll) {
          setScrollNavDirection(null);
        } else {
          // 如果可滚动，默认显示向上箭头（因为在底部）
          setScrollNavDirection('up');
        }
      }
      // 延迟重置标志，避免自动滚动到底部
      setTimeout(() => {
        justSwitchedConversation.current = false;
      }, 100);
    }
  }, [currentConversationId]);

  // 保存当前会话的文件到本地存储
  useEffect(() => {
    if (currentConversationId && conversations.length > 0) {
      setConversations(prev => prev.map(c => {
        if (c.id === currentConversationId) {
          return { ...c, projectFiles };
        }
        return c;
      }));
    }
  }, [projectFiles, currentConversationId]);

  // 自动滚动到底部（仅在 autoScroll 为 true 时）
  useEffect(() => {
    // 如果刚切换了会话，不自动滚动到底部
    if (justSwitchedConversation.current) {
      return;
    }
    // 如果正在通过导航按钮滚动，不执行自动滚动
    if (isScrollingByNav.current) {
      return;
    }
    // 流式输出期间，只在锁定状态时滚动
    if (isLoadingRef.current) {
      if (chatContainerRef.current && autoScroll && isLockedAtBottom.current) {
        // 使用 requestAnimationFrame 确保 DOM 更新后再滚动
        requestAnimationFrame(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        });
      }
      return;
    }
    // 非流式输出期间的正常逻辑
    if (chatContainerRef.current && autoScroll) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentConversation?.messages, streamingContent]);

  // 监听滚动事件，判断用户是否手动滚动
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // 如果正在通过导航按钮滚动，不处理滚动事件
      if (isScrollingByNav.current) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;

      // 流式输出期间的特殊处理：只检测用户的主动向上滚动
      if (isLoadingRef.current) {
        // 判断是否用户主动向上滚动（scrollTop 减小）
        const isUserScrollingUp = scrollTop < lastScrollTop.current;

        if (isUserScrollingUp) {
          // 用户向上滚动，退出底部锁定
          isLockedAtBottom.current = false;
        }

        // 如果用户滚回底部附近（距离<50px），重新锁定并立即滚动
        if (distanceToBottom < 50 && !isLockedAtBottom.current) {
          isLockedAtBottom.current = true;
          // 立即滚动到底部，因为自动滚动 useEffect 可能不会触发
          requestAnimationFrame(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          });
        }

        // 更新上次的滚动位置
        lastScrollTop.current = scrollTop;
        return;
      }

      // 非流式输出期间的正常逻辑

      // 如果锁定在底部，不修改 autoScroll，保持在底部
      if (isLockedAtBottom.current) {
        // 如果用户向上滚动超过一定距离（50px），取消底部锁定
        if (distanceToBottom > 50) {
          isLockedAtBottom.current = false;
          setAutoScroll(false);
        }
        return;
      }

      // 如果用户向上滚动超过一定距离（10px），停止自动滚动
      if (distanceToBottom > 10) {
        setAutoScroll(false);
      } else {
        // 如果用户滚回到底部，恢复自动滚动
        setAutoScroll(true);
        // 滚动到底部，确保用户看到最新内容
        if (distanceToBottom <= 10) {
          container.scrollTop = scrollHeight;
        }
      }

      // 判断是否需要显示导航按钮以及显示哪个方向
      // 只在内容超出容器高度时显示
      const canScroll = scrollHeight > clientHeight;
      if (!canScroll) {
        setScrollNavDirection(null);
        return;
      }

      // 判断当前位置：如果在顶部附近（小于30%），显示向下箭头
      // 如果在底部附近（距离底部小于30%），显示向上箭头
      // 否则显示向上箭头（默认）
      const threshold = clientHeight * 0.3;
      if (scrollTop < threshold) {
        setScrollNavDirection('down');
      } else if (distanceToBottom < threshold) {
        setScrollNavDirection('up');
      } else {
        setScrollNavDirection('up');
      }

      // 更新上次的滚动位置
      lastScrollTop.current = scrollTop;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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
    // 检查是否已存在空的对话
    const existingEmptyConv = conversations.find(c => c.messages.length === 0 && c.title === '新对话');
    if (existingEmptyConv) {
      setCurrentConversationId(existingEmptyConv.id);
      // 聚焦输入框
      setTimeout(() => chatInputRef.current?.focus(), 0);
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
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    // 聚焦输入框
    setTimeout(() => chatInputRef.current?.focus(), 0);
  }, [conversations, model]);

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

    // 如果只有暂存文件没有内容，生成默认消息
    const messageContent = content.trim() || `请分析以下文件：\n${stagedFiles.map(f => f.name).join('\n')}`;

    // 确保有当前对话
    let convId = currentConversationId;
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
    setAutoScroll(true); // 确保自动滚动开启
    lastScrollTop.current = chatContainerRef.current?.scrollTop || 0; // 重置滚动位置

    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          messages: [...c.messages, userMessage],
          updatedAt: new Date(),
          title: c.messages.length === 0 ? messageContent.slice(0, 30) + (messageContent.length > 30 ? '...' : '') : c.title
        };
      }
      return c;
    }));

    setStreamingContent('');

    // 构建消息历史
    const conv = conversations.find(c => c.id === convId);
    const messageHistory = [
      ...(conv?.messages || []).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: messageContent }
    ];

    // 添加暂存文件到项目文件
    if (stagedFiles.length > 0) {
      setProjectFiles(prev => [...prev, ...stagedFiles]);
      // 添加暂存文件上下文
      const filesContext = stagedFiles.map(f => `文件: ${f.name}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n');
      messageHistory.unshift({
        role: 'system',
        content: `用户上传了以下新文件:\n\n${filesContext}\n\n请分析这些文件内容并回答用户的问题。`
      });
    }

    // 添加项目文件上下文（排除刚添加的暂存文件）
    const allProjectFiles = [...projectFiles, ...stagedFiles];
    if (allProjectFiles.length > stagedFiles.length && responseMode === 'code') {
      const filesContext = projectFiles.map(f => `文件: ${f.name}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n');
      messageHistory.unshift({
        role: 'system',
        content: `当前项目包含以下文件:\n\n${filesContext}\n\n请根据这些文件的上下文回答问题或修改代码。`
      });
    }

    // 添加风格选项（仅在代码生成模式）
    if (responseMode === 'code') {
      const stylePrompt = `代码风格要求: ${styleOptions.codeStyle}风格, ${styleOptions.commentLevel === 'full' ? '详细注释' : styleOptions.commentLevel === 'minimal' ? '简洁注释' : '不需要注释'}, 使用${styleOptions.indentation === 'spaces2' ? '2空格' : styleOptions.indentation === 'spaces4' ? '4空格' : 'Tab'}缩进`;
      messageHistory.push({ role: 'system', content: stylePrompt });
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
        // 提取代码块（仅在代码生成模式）
        const codeBlocks = responseMode === 'code' ? extractCodeBlocks(response.content) : [];

        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          reasoning_content: response.reasoning_content,
          thinking_time: response.thinking_time,
          codeBlocks: codeBlocks.map((block, index) => ({
            id: `${generateId()}-${index}`,
            ...block
          }))
        };

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
          timestamp: new Date()
        };

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
      isLockedAtBottom.current = false; // 流式输出结束，取消锁定
      // 流式输出结束后，重置 autoScroll，避免强制拉回底部
      // 让滚动事件处理器根据用户当前位置来决定是否自动滚动
      setAutoScroll(false);
      setStreamingContent('');
      setStreamingReasoningContent('');
      setReasoningStartTime(0);
      setCurrentThinkingTime(0);
      // 仅隐藏完成动画，不隐藏生成完成状态指示器（它会一直显示直到下一次生成）
      setTimeout(() => {
        setShowCompleteAnimation(false);
      }, 3000);
      // 清空暂存文件
      setStagedFiles([]);
    }
  }, [currentConversationId, conversations, model, projectFiles, stagedFiles, styleOptions, responseMode, streamMode, simpleQAMode]);

  // 处理文件上传 - 暂存文件
  const handleFileUpload = useCallback(async (files: FileList) => {
    const newFiles: ProjectFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
        history: []
      });
    }

    // 暂存文件，等待用户发送消息时一起提交
    setStagedFiles(prev => [...prev, ...newFiles]);
  }, []);

  // 移除暂存的文件
  const removeStagedFile = useCallback((fileId: string) => {
    setStagedFiles(prev => prev.filter(f => f.id !== fileId));
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
        history: []
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
      go: 'go', rust: 'rs', html: 'html', css: 'css', json: 'json', sql: 'sql'
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
  const handleExportZip = useCallback(async () => {
    if (projectFiles.length === 0) {
      alert('没有项目文件可导出');
      return;
    }
    const files = projectFiles.map(f => ({ name: f.name, content: f.content }));
    try {
      await exportAsZip(files, 'project');
    } catch (error) {
      console.error('ZIP导出失败:', error);
      alert('导出失败，请稍后重试');
    }
  }, [projectFiles]);

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

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    if (chatContainerRef.current) {
      isScrollingByNav.current = true;
      // 滚动到顶部时，取消底部锁定
      isLockedAtBottom.current = false;
      chatContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      // 监听滚动完成，避免图标快速切换
      const checkScrollEnd = () => {
        if (chatContainerRef.current) {
          if (chatContainerRef.current.scrollTop <= 1) {
            // 已经滚动到顶部
            isScrollingByNav.current = false;
            setScrollNavDirection('down');
          } else {
            // 还在滚动中，继续检查
            requestAnimationFrame(checkScrollEnd);
          }
        }
      };

      // 开始检查滚动状态
      requestAnimationFrame(checkScrollEnd);
    }
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      isScrollingByNav.current = true;
      // 滚动到底部时，锁定在底部
      isLockedAtBottom.current = true;
      const scrollHeight = chatContainerRef.current.scrollHeight;
      chatContainerRef.current.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
      });
      setAutoScroll(true);

      // 监听滚动完成，避免图标快速切换
      const checkScrollEnd = () => {
        if (chatContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
          const distanceToBottom = scrollHeight - scrollTop - clientHeight;
          if (distanceToBottom <= 1) {
            // 已经滚动到底部
            isScrollingByNav.current = false;
            setScrollNavDirection('up');
          } else {
            // 还在滚动中，继续检查
            requestAnimationFrame(checkScrollEnd);
          }
        }
      };

      // 开始检查滚动状态
      requestAnimationFrame(checkScrollEnd);
    }
  }, []);

  return (
      <div className="h-[100dvh] flex flex-col bg-gray-900 text-gray-100">
        {/* 头部 */}
        <Header
            onExportPdf={handleExportPdf}
            onExportZip={handleExportZip}
            onExportImage={handleExportImage}
        />

        {/* 主体 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧边栏 - 对话列表 */}
          <div
              className={`${leftPanelOpen ? 'w-64' : 'w-0'} overflow-hidden border-r border-gray-700 bg-gray-800 flex flex-col flex-shrink-0`}
              style={{ width: leftPanelOpen ? `${leftWidth}px` : '0px' }}
          >
            <ConversationList
                conversations={conversations}
                currentId={currentConversationId}
                onSelect={setCurrentConversationId}
                onNew={createNewConversation}
                onDelete={deleteConversation}
            />
          </div>

          {/* 左侧分隔条 */}
          {leftPanelOpen && (
              <div
                  ref={leftResizerRef}
                  className="w-1 cursor-col-resize bg-gray-700 hover:bg-blue-500 transition-colors flex-shrink-0"
                  style={{ cursor: 'col-resize' }}
              />
          )}

          {/* 中间区域 - 聊天 */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            {/* 面板切换按钮 */}
            <div className="flex items-center justify-between px-2 py-1 bg-gray-800/50 border-b border-gray-700">
              <button
                  onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title={leftPanelOpen ? '隐藏对话列表' : '显示对话列表'}
              >
                <PanelLeftClose size={18} className={leftPanelOpen ? '' : 'rotate-180'} />
              </button>

              <div className="text-sm text-gray-400 flex items-center gap-2">
                {currentConversation ? currentConversation.title : '选择或创建对话'}
                {responseMode === 'simple' ? (
                    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                  简单模式
                </span>
                ) : (
                    <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                  思考模式
                </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                    onClick={() => setRightPanelOpen(!rightPanelOpen)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title={rightPanelOpen ? '隐藏文件面板' : '显示文件面板'}
                >
                  <PanelRightClose size={18} className={rightPanelOpen ? '' : 'rotate-180'} />
                </button>
              </div>
            </div>

            {/* 聊天消息区 */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
              {currentConversation?.messages.map(message => (
                  <ChatMessage
                      key={message.id}
                      message={message}
                      onApplyCode={applyCode}
                      onCopyCode={copyToClipboard}
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
                    />
                  </>
              )}

              {/* 空状态 */}
              {!currentConversation && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">欢迎使用 AiCoder</h3>
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

              {/* 滚动导航按钮 */}
              {scrollNavDirection && currentConversation && (
                  <div className="absolute right-4 bottom-36">
                    <button
                        onClick={scrollNavDirection === 'up' ? scrollToTop : scrollToBottom}
                        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 sm:p-2.5"
                        title={scrollNavDirection === 'up' ? '回到顶部' : '到底部'}
                    >
                      {scrollNavDirection === 'up' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
            />
          </div>

          {/* 右侧分隔条 */}
          {rightPanelOpen && (
              <div
                  ref={rightResizerRef}
                  className="w-1 cursor-col-resize bg-gray-700 hover:bg-blue-500 transition-colors flex-shrink-0"
                  style={{ cursor: 'col-resize' }}
              />
          )}

          {/* 右侧边栏 - 文件和差异 */}
          <div
              className={`${rightPanelOpen ? 'overflow-hidden' : 'w-0 overflow-hidden'} border-l border-gray-700 bg-gray-800 flex flex-col flex-shrink-0`}
              style={{ width: rightPanelOpen ? `${rightWidth}px` : '0px' }}
          >
            {/* 标签页 */}
            <div className="flex border-b border-gray-700">
              <button
                  onClick={() => setRightPanelTab('files')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm transition-colors ${
                      rightPanelTab === 'files'
                          ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
              >
                <FolderOpen size={16} />
                文件
              </button>
              <button
                  onClick={() => setRightPanelTab('diff')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm transition-colors ${
                      rightPanelTab === 'diff'
                          ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
              >
                <GitCompare size={16} />
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
                  />
              ) : (
                  <div className="p-3">
                    {/* 差异视图切换按钮 */}
                    <div className="flex items-center justify-end mb-3">
                      <button
                          onClick={() => setDiffViewMode(prev => prev === 'split' ? 'unified' : 'split')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
                      >
                        <GitCompare size={14} />
                        {diffViewMode === 'split' ? '分栏视图' : '统一视图'}
                      </button>
                    </div>
                    {currentDiff ? (
                        <DiffViewer diff={currentDiff} viewMode={diffViewMode} />
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                          <GitCompare size={40} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">暂无差异对比</p>
                          <p className="text-xs mt-1">应用代码修改后将显示差异</p>
                        </div>
                    )}
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

export default App;
