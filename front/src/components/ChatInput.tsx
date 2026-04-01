import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Brain,
  ChevronDown,
  File,
  Loader2,
  MessageCircle,
  Radio,
  Send,
  Settings,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import { ModelType, ProjectFile, ResponseMode, SimpleQAMode, StreamMode, StyleOptions } from '../types';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface ChatInputProps {
  onSend: (message: string) => void;
  onSendFiles: () => void;
  onFileUpload: (files: FileList) => void;
  onRemoveStagedFile: (fileId: string) => void;
  stagedFiles: ProjectFile[];
  model: ModelType;
  onModelChange: (model: ModelType) => void;
  styleOptions: StyleOptions;
  onStyleChange: (options: StyleOptions) => void;
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
  styleOptions,
  onStyleChange,
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
      onFileUpload(e.target.files);
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
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

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

  return (
    <div
      className={`p-4 absolute bottom-0 left-0 right-0 rounded-tl-[25px] rounded-tr-[25px] ml-0 mr-0 md:ml-20 md:mr-20 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
      {/* 智能推荐 */}
      {showSuggestions && (
        <div ref={suggestionsRef} className="mb-4 grid grid-cols-2 gap-2">
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

      {/* 暂存的文件显示 */}
      {stagedFiles.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>已选择 {stagedFiles.length} 个文件</span>
            <button
              onClick={handleSendWithFiles}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-xs rounded-lg transition-colors"
            >
              <Send size={12}/>
              发送分析
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {stagedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-sm"
              >
                <File size={14} className="text-blue-400"/>
                <span className="text-blue-200">{file.name}</span>
                <button
                  onClick={() => onRemoveStagedFile(file.id)}
                  className="p-0.5 hover:bg-blue-500/30 rounded transition-colors"
                >
                  <X size={14} className="text-blue-300 hover:text-white"/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 统一设置面板 */}
      {showSettings && (
        <div ref={settingsRef}
             className={`mb-4 p-4 rounded-lg space-y-4 ${isDark ? 'bg-gray-700/50' : 'bg-gray-200/50'}`}>
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
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="includeCodeExamples"
                      checked={simpleQAMode.includeCodeExamples}
                      onChange={(e) => onSimpleQAModeChange({...simpleQAMode, includeCodeExamples: e.target.checked})}
                      className={`rounded text-blue-500 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    />
                    <label htmlFor="includeCodeExamples"
                           className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>包含代码示例</label>
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

          {/* 代码风格设置 */}
          <div className={`pt-4 ${isDark ? 'border-t border-gray-600' : 'border-t border-gray-300'}`}>
            <div className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>代码风格设置</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>代码风格</label>
                <select
                  value={styleOptions.codeStyle}
                  onChange={(e) => onStyleChange({
                    ...styleOptions,
                    codeStyle: e.target.value as StyleOptions['codeStyle']
                  })}
                  className={`w-full text-sm rounded px-2 py-1.5 border ${isDark ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                >
                  <option value="modern">现代</option>
                  <option value="classic">经典</option>
                  <option value="minimal">简约</option>
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>注释级别</label>
                <select
                  value={styleOptions.commentLevel}
                  onChange={(e) => onStyleChange({
                    ...styleOptions,
                    commentLevel: e.target.value as StyleOptions['commentLevel']
                  })}
                  className={`w-full text-sm rounded px-2 py-1.5 border ${isDark ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                >
                  <option value="full">详细</option>
                  <option value="minimal">简洁</option>
                  <option value="none">无注释</option>
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>缩进方式</label>
                <select
                  value={styleOptions.indentation}
                  onChange={(e) => onStyleChange({
                    ...styleOptions,
                    indentation: e.target.value as StyleOptions['indentation']
                  })}
                  className={`w-full text-sm rounded px-2 py-1.5 border ${isDark ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                >
                  <option value="auto">智能</option>
                  <option value="spaces2">2空格</option>
                  <option value="spaces4">4空格</option>
                  <option value="tabs">Tab</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模型选择和设置 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={`flex items-center gap-2 text-sm rounded px-3 py-1.5 focus:outline-none ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-800 hover:bg-gray-50'}`}
              >
                {model === 'deepseek' ? 'DeepSeek' : model === 'kimi' ? 'Kimi' : model === 'glm' ? 'GLM' : model === 'claude' ? 'Claude' : 'GPT'}
                <ChevronDown size={14}/>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={`min-w-[140px] rounded-lg shadow-lg p-1 ${isDark ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}
                align="start"
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
          <button
            ref={suggestionsButtonRef}
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={`p-1.5 rounded-lg transition-colors ${showSuggestions ? 'bg-yellow-500/20 text-yellow-400' : `${isDark ? 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700' : 'text-gray-600 hover:text-yellow-600 hover:bg-gray-200'}`}`}
            title="智能推荐"
          >
            <Sparkles size={18}/>
          </button>

          <button
            onClick={toggleSimpleQAMode}
            className={`p-1.5 rounded-lg transition-colors ${responseMode === 'code' ? 'bg-blue-500/20 text-blue-400' : `${isDark ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200'}`}`}
            title={responseMode === 'code' ? '思考模式' : '简单模式'}
          >
            <Brain size={18}/>
          </button>

          <button
            ref={settingsButtonRef}
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-blue-500/20 text-blue-400' : `${isDark ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200'}`}`}
            title="设置"
          >
            <Settings size={18}/>
          </button>

          {/* 生成完成提示 - 一直显示直到下一次生成 */}
          {streamComplete && (
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/>
              生成完成
            </span>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".js,.ts,.tsx,.jsx,.py,.java,.go,.rs,.cpp,.c,.h,.html,.css,.json,.md,.txt,.vue,.sql"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600' : 'text-gray-700 hover:text-gray-900 bg-gray-200 hover:bg-gray-300'}`}
        >
          <Upload size={16}/>
          上传文件
        </button>
      </div>

      {/* 输入框 */}
      <div className="flex gap-3">
        <div className="flex-1 relative mb-[-6px]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={simpleQAMode.enabled ? "输入问题，获得简洁回答..." : "思考后再回答你的问题..."}
            className={`w-full rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed ${isDark ? 'bg-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400'}`}
            rows={1}
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 self-end w-[48px] h-[48px] flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin"/> : <Send size={20}/>}
        </button>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
