import { memo, useMemo } from 'react';
import { CodeBlock, Message, MessageContent } from '../types';
import { CodeBlockView } from './CodeBlockView';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import { useEffect, useRef, useState } from 'react';

// Mermaid 渲染组件
const MermaidBlock = memo(function MermaidBlock({ chart, isDark }: { chart: string; isDark: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const renderChart = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart.trim());
        setSvg(renderedSvg);
        setError('');
      } catch (err) {
        setError('流程图渲染失败');
        console.error('Mermaid render error:', err);
      }
    };
    renderChart();
  }, [chart, isDark]);

  if (error) {
    return (
      <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-x-auto p-4 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

interface ChatMessageProps {
  message: Message;
  onApplyCode?: (code: CodeBlock) => void;
  onCopyCode?: (code: string) => void;
  isDark: boolean;
}

// 解析消息中的代码块（包括未完成的代码块）
function parseContent(content: string | MessageContent[]) {
  // 如果content是数组格式，返回空数组（用户消息直接显示，不需要解析）
  if (Array.isArray(content)) {
    return [];
  }

  const parts: {
    type: 'text' | 'code';
    content: string;
    language?: string;
    filename?: string;
    incomplete?: boolean
  }[] = [];
  let lastIndex = 0;

  // 匹配完整的代码块
  const codeBlockRegex = /```(\w+)?(?:\s*\/\/\s*(.+))?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // 添加代码块之前的文本
    if (match.index > lastIndex) {
      parts.push({type: 'text', content: content.slice(lastIndex, match.index)});
    }

    // 添加完整的代码块
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      filename: match[2]?.trim(),
      content: match[3].trim(),
      incomplete: false
    });

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);

    // 检查剩余文本是否包含未完成的代码块（只有 ``` 开头没有结尾）
    const incompleteCodeMatch = remaining.match(/```(\w+)?(?:\s*\/\/\s*(.+))?\n([\s\S]*)$/);

    if (incompleteCodeMatch) {
      // 添加代码块前的文本（如果有）
      const beforeCode = remaining.slice(0, incompleteCodeMatch.index);
      if (beforeCode) {
        parts.push({type: 'text', content: beforeCode});
      }

      // 添加未完成的代码块
      parts.push({
        type: 'code',
        language: incompleteCodeMatch[1] || 'plaintext',
        filename: incompleteCodeMatch[2]?.trim(),
        content: incompleteCodeMatch[3].trim(),
        incomplete: true // 标记为未完成
      });
    } else {
      // 纯文本
      parts.push({type: 'text', content: remaining});
    }
  }

  return parts.length > 0 ? parts : [{type: 'text' as const, content}];
}

export const ChatMessage = memo(function ChatMessage({message, onApplyCode, onCopyCode, isDark}: ChatMessageProps) {
  const isUser = message.role === 'user';

  // 缓存解析结果，只在 message.content 变化时重新解析
  const contentParts = useMemo(() => parseContent(message.content), [message.content]);

  return (
    <div
      className={`flex gap-4 px-0 md:px-4 py-4 ml-2 mr-2 mt-2 rounded-[20px] ${isUser ? (isDark ? 'bg-gray-800/50' : 'bg-gray-100/50') : (isDark ? 'bg-gray-900/50' : 'bg-gray-50/50')}`}>
      {/* 头像 */}
      <div
        className={`flex-shrink-0 w-0 h-0 md:w-8 md:h-8 rounded-lg flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-600 to-pink-500'}`}>
        {isUser ? <User size={18} className="text-white"/> : <Bot size={18} className="text-white"/>}
      </div>

      {/* 消息内容 */}
      <div className="flex-1 overflow-hidden">
        <div className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          {isUser ? '你' : 'AI 助手'}
          <span className="ml-2">{new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
          {!isUser && message.model && (
            <span
              className={`ml-2 px-2 rounded-full text-xs ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              {message.model === 'deepseek' ? 'DeepSeek' : message.model === 'kimi' ? 'Kimi' : message.model === 'glm' ? 'GLM' : message.model === 'claude' ? 'Claude' : 'GPT'}
            </span>
          )}
        </div>

        <div className={`space-y-3 overflow-visible ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {/* 用户消息：支持文本和图像 */}
          {isUser ? (
            <div className="space-y-2">
              {typeof message.content === 'string' ? (
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
              ) : (
                message.content.map((item, index) => (
                  item.type === 'text' ? (
                    <div key={index} className="whitespace-pre-wrap break-words">{item.text}</div>
                  ) : item.type === 'image_url' ? (
                    <div key={index} className="mt-2">
                      <img
                        src={item.image_url?.url}
                        alt="上传的图片"
                        className="w-20 h-auto rounded-lg"
                        style={{maxHeight: '200px'}}
                      />
                    </div>
                  ) : null
                ))
              )}
            </div>
          ) : (
            /* 思考内容 - 仅对助手消息且存在思考内容时显示 */
            <>
              {!isUser && message.reasoning_content && (
                <details
                  className={`border rounded-lg overflow-hidden ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-100/50'}`}
                  open={true}>
                  <summary
                    className={`px-4 py-2 cursor-pointer transition-colors text-sm select-none ${isDark ? 'text-gray-400 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-gray-200/50'}`}>
                    {message.thinking_time === 0 ? '思考中...' : `已思考（用时 ${message.thinking_time} 秒）`}
                  </summary>
                  <div className={`px-4 py-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                    <div className={`prose prose-sm max-w-none break-words ${isDark ? 'prose-invert' : ''}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({children}) => <p
                            className={isDark ? 'text-gray-400 my-1' : 'text-gray-600 my-1'}>{children}</p>,
                          ul: ({children}) => <ul
                            className={`list-disc ml-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{children}</ul>,
                          ol: ({children}) => <ol
                            className={`list-decimal ml-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{children}</ol>,
                          li: ({children}) => <li className="">{children}</li>,
                        }}
                      >{message.reasoning_content}</ReactMarkdown>
                    </div>
                  </div>
                </details>
              )}

              {contentParts.map((part, index) => (
                part.type === 'code' ? (
                  (part.language === 'mermaid' && !part.incomplete) ? (
                    <MermaidBlock key={index} chart={part.content} isDark={isDark} />
                  ) : (
                    <CodeBlockView
                    key={index}
                    id={`${message.id}-${index}`}
                    code={part.content}
                    language={part.language || 'plaintext'}
                    filename={part.filename}
                    onCopy={onCopyCode}
                    onApply={!part.incomplete && onApplyCode ? () => onApplyCode({
                      id: `${message.id}-${index}`,
                      code: part.content,
                      language: part.language || 'plaintext',
                      filename: part.filename
                    }) : undefined}
                    incomplete={part.incomplete}
                    isDark={isDark}
                  />
                  )
                ) : (
                  <div key={index} className={`prose prose-sm max-w-none break-words ${isDark ? 'prose-invert' : ''}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}  // 合并 remark 插件
                      rehypePlugins={[rehypeKatex]}            // rehype 插件
                      components={{
                        ul: ({children}) => <ul className="list-disc">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal">{children}</ol>,
                        li: ({children}) => <li className="my-0">{children}</li>,
                        p: ({children}) => <p className="my-1">{children}</p>,
                        table: ({children}) => (
                          <div className="overflow-x-auto my-4">
                            <table
                              className={`min-w-full border-collapse border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{children}</table>
                          </div>
                        ),
                        thead: ({children}) => <thead
                          style={{backgroundColor: isDark ? '#2a3445' : '#f3f4f6'}}>{children}</thead>,
                        tbody: ({children}) => <tbody>{children}</tbody>,
                        tr: ({children}) => <tr
                          className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>{children}</tr>,
                        th: ({children}) => <th
                          className={`px-4 py-2 text-left border-r last:border-r-0 ${isDark ? 'text-gray-200 border-gray-700' : 'text-gray-800 border-gray-300'}`}>{children}</th>,
                        td: ({children}) => <td
                          className={`px-4 py-2 border-r last:border-r-0 ${isDark ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-300'}`}
                          style={{backgroundColor: isDark ? '#49546326' : '#f3f4f640'}}>{children}</td>,
                      }}
                    >{part.content}</ReactMarkdown>
                  </div>
                )
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
});