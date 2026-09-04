import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Brain,
  CheckCircle,
  ChevronDown,
  File,
  Link,
  Loader2,
  MessageCircle,
  Radio,
  Send,
  Settings,
  Sparkles,
  X
} from 'lucide-react';
import { ModelType, ProjectFile, ResponseMode, SimpleQAMode, StreamMode } from '../types';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface ChatInputProps {
  onSend: (message: string) => void;
  onSendFiles: () => void;
  onFileUpload: (files: FileList) => void;
  onRemoveStagedFile: (fileId: string) => void;
  stagedFiles: ProjectFile[];
  model: ModelType;
  onModelChange: (model: ModelType) => void;
  isLoading: boolean;
  suggestions?: string[];
  responseMode: ResponseMode;
  onResponseModeChange: (mode: ResponseMode) => void;
  streamMode: StreamMode;
  onStreamModeChange: (mode: StreamMode) => void;
  simpleQAMode: SimpleQAMode;
  onSimpleQAModeChange: (mode: SimpleQAMode) => void;
  streamComplete?: boolean;
  isDark: boolean;
}

export interface ChatInputRef {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({
  onSend,
  onSendFiles,
  onFileUpload,
  onRemoveStagedFile,
  stagedFiles,
  model,
  onModelChange,
  isLoading,
  suggestions = [],
  responseMode,
  onResponseModeChange,
  streamMode,
  onStreamModeChange,
  simpleQAMode,
  onSimpleQAModeChange,
  streamComplete = false,
  isDark
}, ref) => {
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const suggestionsButtonRef = useRef<HTMLButtonElement>(null);

  // 暴露 focus 方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
      setShowSuggestions(false);
    }
  };

  const handleSendWithFiles = () => {
    if (!isLoading && stagedFiles.length > 0) {
      onSendFiles();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 在输入法组合状态下，不处理回车键
    if (isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 处理输入法 composition 事件
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    // 组合结束后修剪末尾空白
    const textarea = e.currentTarget;
    const trimmedValue = textarea.value.trimEnd();
    if (textarea.value !== trimmedValue) {
      setInput(trimmedValue);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // 非GPT模型时过滤图片文件
      if (model !== 'gpt') {
        const files = Array.from(e.target.files);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
        const imageFiles: File[] = [];
        const otherFiles: File[] = [];

        files.forEach(file => {
          const ext = '.' + file.name.split('.').pop()?.toLowerCase();
          if (imageExtensions.includes(ext)) {
            imageFiles.push(file);
          } else {
            otherFiles.push(file);
          }
        });

        // 如果有图片文件被过滤，显示提示
        if (imageFiles.length > 0) {
          alert(`图片分析仅支持 GPT 模型，已自动过滤 ${imageFiles.length} 个图片文件`);
        }

        // 只上传非图片文件
        if (otherFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          otherFiles.forEach(file => dataTransfer.items.add(file));
          onFileUpload(dataTransfer.files);
        }
      } else {
        onFileUpload(e.target.files);
      }
      // 重置 input 值，允许重复选择相同文件
      e.target.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 正常输入时保留用户输入的空格和换行
    setInput(e.target.value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 粘贴时去除末尾的空白
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const currentValue = textarea.value;
      const trimmedPastedText = pastedText.trimEnd();
      const newValue = currentValue.substring(0, startPos) + trimmedPastedText + currentValue.substring(endPos);
      setInput(newValue);
      // 移动光标到粘贴内容的末尾
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = startPos + trimmedPastedText.length;
      }, 0);
    }
  };

  const useSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  // 切换简单问答模式
  const toggleSimpleQAMode = () => {
    const newEnabled = !simpleQAMode.enabled;
    onSimpleQAModeChange({
      ...simpleQAMode,
      enabled: newEnabled
    });
    onResponseModeChange(newEnabled ? 'simple' : 'code');
  };

  useEffect(() => {
    if (textareaRef.current) {
      // 设置 textarea 实际高度
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
      // 文字换行（scrollHeight 超过单行约 40px）则展开
      // 展开后只有内容清空才收回，避免振荡
      if (input.trim().length === 0) {
        setIsExpanded(false);
      } else if (!isExpanded && newHeight > 40) {
        setIsExpanded(true);
      }
    }
  }, [input, isExpanded]);

  // 点击外部关闭设置面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current &&
        !settingsRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // 点击外部关闭智能推荐面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        suggestionsButtonRef.current &&
        !suggestionsButtonRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  const defaultSuggestions = [
    '优化重构这段代码，提高可读性和性能',
    '写一个Python爬虫实例',
    '审查并指出常见问题和改进建议',
    "推荐一些周末短途旅行地",
    "简单的家常菜食谱",
    "设计一个高并发的短链接生成系统"
  ];

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  const panelClass = isDark
    ? 'border-gray-700/50 bg-gray-dark-800/80'
    : 'border-gray-200/50 bg-gray-50/80';

  return (
    <div className="absolute bottom-6 left-0 right-0 md:left-20 md:right-20 z-10">
      {/* 悬浮面板区域：智能推荐 / 暂存文件 / 设置 */}
      {showSuggestions && (
        <div ref={suggestionsRef} className={`mb-2 grid grid-cols-2 gap-2 rounded-2xl border backdrop-blur-xl p-3 ${panelClass}`}>
          {displaySuggestions.slice(0, 6).map((suggestion, index) => (
            <button
              key={index}
              onClick={() => useSuggestion(suggestion)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${isDark ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
            >
              <Sparkles size={14} className="text-yellow-400 flex-shrink-0"/>
              <span className="truncate">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {stagedFiles.length > 0 && (
        <div className={`mb-2 rounded-2xl border backdrop-blur-xl p-3 ${panelClass}`}>
          <div className="flex flex-wrap gap-2">
            {stagedFiles.map((file) => (
              <div
                key={file.id}
                className={`relative group ${
                  file.type === 'image'
                    ? 'w-20 h-20 rounded-lg overflow-hidden border-2'
                    : 'flex items-center gap-2 px-3 py-1.5 rounded-lg'
                } ${
                  file.uploadStatus === 'uploading'
                    ? 'border-yellow-500/50 bg-yellow-500/10'
                    : file.uploadStatus === 'success'
                      ? 'border-green-500/50 bg-green-500/10'
                      : file.uploadStatus === 'error'
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'bg-blue-600/20 border-blue-500/30'
                }`}
              >
                {file.type === 'image' ? (
                  <>
                    <img
                      src={file.previewUrl || file.imageUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                    {file.uploadStatus === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 size={16} className="text-white animate-spin"/>
                      </div>
                    )}
                    {file.uploadStatus === 'success' && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                        <CheckCircle size={12} className="text-white"/>
                      </div>
                    )}
                    {file.uploadStatus === 'error' && (
                      <div className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5">
                        <X size={12} className="text-white"/>
                      </div>
                    )}
                    {file.uploadProgress !== undefined && file.uploadProgress > 0 && file.uploadProgress < 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{width: `${file.uploadProgress}%`}}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <File size={14} className="text-blue-400"/>
                    <span className="text-blue-200">{file.name}</span>
                  </>
                )}
                <button
                  onClick={() => onRemoveStagedFile(file.id)}
                  className={`absolute ${
                    file.type === 'image'
                      ? 'top-1 left-1 bg-red-500/80 hover:bg-red-500 rounded-full p-0.5'
                      : 'p-0.5 hover:bg-blue-500/30 rounded'
                  } transition-colors`}
                >
                  <X size={14} className="text-white"/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSettings && (
        <div ref={settingsRef}
             className={`mb-2 p-4 rounded-2xl border backdrop-blur-xl space-y-4 ${panelClass}`}>
          {/* 简单问答模式设置 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                <MessageCircle size={18}
                               className={simpleQAMode.enabled ? 'text-green-400' : (isDark ? 'text-gray-400' : 'text-gray-500')}/>
                <div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>简单模式</div>
                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                    {simpleQAMode.enabled ? '简单问题给出简洁回答' : '生成思考过程和完整代码结构'}
                  </div>
                </div>
              </div>
              {simpleQAMode.enabled && (
                <>
                  <div>
                    <select
                      value={simpleQAMode.maxResponseLength}
                      onChange={(e) => onSimpleQAModeChange({
                        ...simpleQAMode,
                        maxResponseLength: e.target.value as 'short' | 'medium' | 'long'
                      })}
                      className={`text-sm rounded px-2 py-1 border ${isDark ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                    >
                      <option value="short">简短</option>
                      <option value="medium">适中</option>
                      <option value="long">详细</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={toggleSimpleQAMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                simpleQAMode.enabled ? 'bg-green-500' : (isDark ? 'bg-gray-600' : 'bg-gray-400')
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  simpleQAMode.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 流式输出模式 */}
          <div
            className={`flex items-center justify-between pt-4 ${isDark ? 'border-t border-gray-600' : 'border-t border-gray-300'}`}>
            <div className="flex items-center gap-2">
              <Radio size={18}
                     className={streamMode === 'stream' ? 'text-blue-400' : (isDark ? 'text-gray-400' : 'text-gray-500')}/>
              <div>
                <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>流式输出</div>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                  {streamMode === 'stream' ? '实时显示生成内容' : '等待完整响应后一次性显示'}
                </div>
              </div>
            </div>
            <button
              onClick={() => onStreamModeChange(streamMode === 'stream' ? 'direct' : 'stream')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                streamMode === 'stream' ? 'bg-blue-500' : (isDark ? 'bg-gray-600' : 'bg-gray-400')
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  streamMode === 'stream' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* 输入栏 — OpenAI 风格动态 grid 布局 */}
      <div
        className={`grid grid-cols-[auto_1fr_auto] gap-x-1.5 ${isExpanded ? 'rounded-[30px]' : 'rounded-[45px]'} border backdrop-blur-xl px-2.5 py-2 shadow-lg ${panelClass}`}
        style={{
          gridTemplateAreas: isExpanded
            ? `"primary primary primary" "leading . trailing"`
            : `"leading primary trailing"`,
        }}>

        {/* 左列：附件上传 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex-shrink-0 p-2 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700/50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200/50'}`}
          style={{ gridArea: 'leading' }}
          title={model === 'gpt' ? '上传文件（支持图片）' : '上传文件（仅代码文件，图片仅GPT支持）'}
        >
          <Link size={18}/>
        </button>

        {/* 中列：输入框 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={simpleQAMode.enabled ? "输入问题，获得简洁回答..." : "思考后再回答你的问题..."}
          className={`w-full resize-none focus:outline-none bg-transparent border-none px-2 py-2 max-h-[200px] ${isDark ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
          style={{ gridArea: 'primary' }}
          rows={1}
          disabled={isLoading}
        />

        {/* 右列：按钮组 */}
        <div className="flex items-center gap-1.5" style={{ gridArea: 'trailing' }}>
          {/* 智能推荐 */}
          <button
            ref={suggestionsButtonRef}
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={`flex-shrink-0 p-2 rounded-xl transition-colors ${showSuggestions ? 'bg-yellow-500/20 text-yellow-400' : `${isDark ? 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700/50' : 'text-gray-600 hover:text-yellow-600 hover:bg-gray-200/50'}`}`}
            title="智能推荐"
          >
            <Sparkles size={18}/>
          </button>

          {/* 思考模式 */}
          <button
            onClick={toggleSimpleQAMode}
            className={`flex-shrink-0 p-2 rounded-xl transition-colors ${responseMode === 'code' ? 'bg-blue-500/20 text-blue-400' : `${isDark ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700/50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200/50'}`}`}
            title={responseMode === 'code' ? '思考模式' : '简单模式'}
          >
            <Brain size={18}/>
          </button>

          {/* 设置 */}
          <button
            ref={settingsButtonRef}
            onClick={() => setShowSettings(!showSettings)}
            className={`flex-shrink-0 p-2 rounded-xl transition-colors ${showSettings ? 'bg-blue-500/20 text-blue-400' : `${isDark ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700/50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200/50'}`}`}
            title="设置"
          >
            <Settings size={18}/>
          </button>

          {/* 模型选择 */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={`flex-shrink-0 flex items-center gap-1 text-sm rounded-xl px-2.5 py-2 focus:outline-none transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-700 hover:bg-gray-200/50'}`}
              >
                {model === 'deepseek' ? 'DeepSeek' : model === 'kimi' ? 'Kimi' : model === 'glm' ? 'GLM' : model === 'claude' ? 'Claude' : 'GPT'}
                <ChevronDown size={14}/>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={`min-w-[140px] rounded-lg shadow-lg p-1 z-[9999] ${isDark ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}
                align="end"
                sideOffset={4}
              >
                <DropdownMenu.Item
                  className={`flex flex-col items-center px-3 py-2 text-sm rounded-md cursor-pointer outline-none focus:bg-blue-500 ${model === 'deepseek' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'text-gray-200' : 'text-gray-700')}`}
                  onClick={() => onModelChange('deepseek')}
                >
                  <span className="font-medium">DeepSeek</span>
                  <span className={`text-xs ${isDark ? 'text-gray-100' : 'text-gray-500'}`}>V3.2</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={`flex flex-col items-center px-3 py-2 text-sm rounded-md cursor-pointer outline-none focus:bg-blue-500 ${model === 'kimi' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'text-gray-200' : 'text-gray-700')}`}
                  onClick={() => onModelChange('kimi')}
                >
                  <span className="font-medium">Kimi</span>
                  <span className={`text-xs ${isDark ? 'text-gray-100' : 'text-gray-500'}`}>K2.5</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={`flex flex-col items-center px-3 py-2 text-sm rounded-md cursor-pointer outline-none focus:bg-blue-500 ${model === 'glm' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'text-gray-200' : 'text-gray-700')}`}
                  onClick={() => onModelChange('glm')}
                >
                  <span className="font-medium">GLM</span>
                  <span className={`text-xs ${isDark ? 'text-gray-100' : 'text-gray-500'}`}>glm-5</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={`flex flex-col items-center px-3 py-2 text-sm rounded-md cursor-pointer outline-none focus:bg-blue-500 ${model === 'claude' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'text-gray-200' : 'text-gray-700')}`}
                  onClick={() => onModelChange('claude')}
                >
                  <span className="font-medium">Claude</span>
                  <span className={`text-xs ${isDark ? 'text-gray-100' : 'text-gray-500'}`}>Haiku-4.5</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={`flex flex-col items-center px-3 py-2 text-sm rounded-md cursor-pointer outline-none focus:bg-blue-500 ${model === 'gpt' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'text-gray-200' : 'text-gray-700')}`}
                  onClick={() => onModelChange('gpt')}
                >
                  <span className="font-medium">GPT</span>
                  <span className={`text-xs ${isDark ? 'text-gray-100' : 'text-gray-500'}`}>gpt-5.4</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* 发送按钮 */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center disabled:cursor-not-allowed rounded-[45px] backdrop-blur-xl transition-colors text-white ${isDark ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600' : 'bg-blue-500 hover:bg-blue-400 disabled:bg-gray-400'}`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept={model === 'gpt'
            ? ".js,.ts,.tsx,.jsx,.py,.java,.go,.rs,.cpp,.c,.h,.html,.css,.json,.md,.txt,.vue,.sql,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.ico"
            : ".js,.ts,.tsx,.jsx,.py,.java,.go,.rs,.cpp,.c,.h,.html,.css,.json,.md,.txt,.vue,.sql"
          }
          className="hidden"
        />
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
