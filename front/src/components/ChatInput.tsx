import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Upload, Settings, Sparkles, Loader2, MessageCircle, Zap, Radio, File, X } from 'lucide-react';
import { ModelType, StyleOptions, ResponseMode, StreamMode, SimpleQAMode, ProjectFile } from '../types';

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
  streamComplete = false
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
    '帮我写一个 React 登录组件，包含表单验证',
    '用 Python 实现一个简单的 REST API 服务',
    '创建一个 TypeScript 工具函数库',
    '优化这段代码的性能',
    '添加单元测试用例',
    '重构代码，提高可读性'
  ];

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  return (
    <div className="border-t border-gray-700 bg-gray-800 p-4">
      {/* 智能推荐 */}
      {showSuggestions && (
        <div ref={suggestionsRef} className="mb-4 grid grid-cols-2 gap-2">
          {displaySuggestions.slice(0, 6).map((suggestion, index) => (
            <button
              key={index}
              onClick={() => useSuggestion(suggestion)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
            >
              <Sparkles size={14} className="text-yellow-400 flex-shrink-0" />
              <span className="truncate">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* 暂存的文件显示 */}
      {stagedFiles.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">已选择 {stagedFiles.length} 个文件</span>
            <button
              onClick={handleSendWithFiles}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-xs rounded-lg transition-colors"
            >
              <Send size={12} />
              发送分析
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {stagedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-sm"
              >
                <File size={14} className="text-blue-400" />
                <span className="text-blue-200">{file.name}</span>
                <button
                  onClick={() => onRemoveStagedFile(file.id)}
                  className="p-0.5 hover:bg-blue-500/30 rounded transition-colors"
                >
                  <X size={14} className="text-blue-300 hover:text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 统一设置面板 */}
      {showSettings && (
        <div ref={settingsRef} className="mb-4 p-4 bg-gray-700/50 rounded-lg space-y-4">
          {/* 简单问答模式设置 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                <MessageCircle size={18} className={simpleQAMode.enabled ? 'text-green-400' : 'text-gray-400'} />
                <div>
                  <div className="text-sm font-medium text-gray-200">简单模式</div>
                  <div className="text-xs text-gray-500">
                    {simpleQAMode.enabled ? '简单问题给出简洁回答' : '生成思考过程和完整代码结构'}
                  </div>
                </div>
              </div>
              {simpleQAMode.enabled && (
                <>
                  <div>
                    <select
                      value={simpleQAMode.maxResponseLength}
                      onChange={(e) => onSimpleQAModeChange({ ...simpleQAMode, maxResponseLength: e.target.value as 'short' | 'medium' | 'long' })}
                      className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 border border-gray-600"
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
                      onChange={(e) => onSimpleQAModeChange({ ...simpleQAMode, includeCodeExamples: e.target.checked })}
                      className="rounded bg-gray-700 border-gray-600 text-blue-500"
                    />
                    <label htmlFor="includeCodeExamples" className="text-sm text-gray-300">包含代码示例</label>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={toggleSimpleQAMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                simpleQAMode.enabled ? 'bg-green-500' : 'bg-gray-600'
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
          <div className="flex items-center justify-between border-t border-gray-600 pt-4">
            <div className="flex items-center gap-2">
              <Radio size={18} className={streamMode === 'stream' ? 'text-blue-400' : 'text-gray-400'} />
              <div>
                <div className="text-sm font-medium text-gray-200">流式输出</div>
                <div className="text-xs text-gray-500">
                  {streamMode === 'stream' ? '实时显示生成内容' : '等待完整响应后一次性显示'}
                </div>
              </div>
            </div>
            <button
              onClick={() => onStreamModeChange(streamMode === 'stream' ? 'direct' : 'stream')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                streamMode === 'stream' ? 'bg-blue-500' : 'bg-gray-600'
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
          <div className="border-t border-gray-600 pt-4">
            <div className="text-sm font-medium text-gray-200 mb-3">代码风格设置</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">代码风格</label>
                <select
                  value={styleOptions.codeStyle}
                  onChange={(e) => onStyleChange({ ...styleOptions, codeStyle: e.target.value as StyleOptions['codeStyle'] })}
                  className="w-full bg-gray-700 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-600"
                >
                  <option value="modern">现代</option>
                  <option value="classic">经典</option>
                  <option value="minimal">简约</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">注释级别</label>
                <select
                  value={styleOptions.commentLevel}
                  onChange={(e) => onStyleChange({ ...styleOptions, commentLevel: e.target.value as StyleOptions['commentLevel'] })}
                  className="w-full bg-gray-700 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-600"
                >
                  <option value="full">详细</option>
                  <option value="minimal">简洁</option>
                  <option value="none">无注释</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">缩进方式</label>
                <select
                    value={styleOptions.indentation}
                    onChange={(e) => onStyleChange({
                      ...styleOptions,
                      indentation: e.target.value as StyleOptions['indentation']
                    })}
                    className="w-full bg-gray-700 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-600"
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
          <select
              value={model}
              onChange={(e) => onModelChange(e.target.value as ModelType)}
              className="bg-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="deepseek" className="hover:bg-gray-600 transition-colors">DeepSeek</option>
            <option value="kimi" className="hover:bg-gray-600 transition-colors">Kimi</option>
            <option value="glm" className="hover:bg-gray-600 transition-colors">GLM</option>
          </select>
          <button
              ref={suggestionsButtonRef}
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={`p-1.5 rounded-lg transition-colors ${showSuggestions ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'}`}
              title="智能推荐"
          >
            <Sparkles size={18}/>
          </button>

          <button
              ref={settingsButtonRef}
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'}`}
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
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <Upload size={16} />
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
            className="w-full bg-gray-700 text-gray-100 rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
            rows={1}
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 self-end w-[48px] h-[48px] flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
