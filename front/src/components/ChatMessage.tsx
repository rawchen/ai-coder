import { Message, CodeBlock } from '../types';
import { CodeBlockView } from './CodeBlockView';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface ChatMessageProps {
  message: Message;
  onApplyCode?: (code: CodeBlock) => void;
  onCopyCode?: (code: string) => void;
}

export function ChatMessage({ message, onApplyCode, onCopyCode }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // 解析消息中的代码块
  const parseContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?(?:\s*\/\/\s*(.+?))?\n([\s\S]*?)```/g;
    const parts: { type: 'text' | 'code'; content: string; language?: string; filename?: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // 添加代码块之前的文本
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }

      // 添加代码块
      parts.push({
        type: 'code',
        language: match[1] || 'plaintext',
        filename: match[2]?.trim(),
        content: match[3].trim()
      });

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余文本
    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, content }];
  };

  const contentParts = parseContent(message.content);

  return (
    <div className={`flex gap-4 p-4 ${isUser ? 'bg-gray-800/50' : 'bg-gray-900/50'}`}>
      {/* 头像 */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-600 to-pink-500'}`}>
        {isUser ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
      </div>

      {/* 消息内容 */}
      <div className="flex-1 overflow-hidden">
        <div className="text-xs text-gray-500 mb-1">
          {isUser ? '你' : 'AI 助手'}
          <span className="ml-2">{new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="text-gray-200 space-y-3 overflow-visible">
          {/* 用户消息：直接显示原始文本 */}
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            /* 思考内容 - 仅对助手消息且存在思考内容时显示 */
            <>
              {!isUser && message.reasoning_content && (
                <details className="border border-gray-700 rounded-lg bg-gray-800/50 overflow-hidden" open={true}>
                  <summary className="px-4 py-2 cursor-pointer hover:bg-gray-700/50 transition-colors text-sm text-gray-400 select-none">
                    {message.thinking_time === 0 ? '思考中...' : `已思考（用时 ${message.thinking_time} 秒）`}
                  </summary>
                  <div className="px-4 py-3 border-t border-gray-700">
                    <div className="prose prose-invert prose-sm max-w-none break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => <p className="text-gray-400 my-1">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc ml-4 text-gray-400">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal ml-4 text-gray-400">{children}</ol>,
                          li: ({ children }) => <li className="">{children}</li>,
                        }}
                      >{message.reasoning_content}</ReactMarkdown>
                    </div>
                  </div>
                </details>
              )}

              {contentParts.map((part, index) => (
                part.type === 'code' ? (
                  <CodeBlockView
                    key={index}
                    code={part.content}
                    language={part.language || 'plaintext'}
                    filename={part.filename}
                    onCopy={onCopyCode}
                    onApply={onApplyCode ? () => onApplyCode({
                      id: `${message.id}-${index}`,
                      code: part.content,
                      language: part.language || 'plaintext',
                      filename: part.filename
                    }) : undefined}
                  />
                ) : (
                  <div key={index} className="prose prose-invert prose-sm max-w-none break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}  // 合并 remark 插件
                      rehypePlugins={[rehypeKatex]}            // rehype 插件
                      components={{
                        ul: ({ children }) => <ul className="list-disc">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal">{children}</ol>,
                        li: ({ children }) => <li className="my-0">{children}</li>,
                        p: ({ children }) => <p className="my-1">{children}</p>,
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-gray-700">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead style={{ backgroundColor: '#2a3445' }}>{children}</thead>,
                        tbody: ({ children }) => <tbody>{children}</tbody>,
                        tr: ({ children }) => <tr className="border-b border-gray-700">{children}</tr>,
                        th: ({ children }) => <th className="px-4 py-2 text-left text-gray-200 border-r border-gray-700 last:border-r-0">{children}</th>,
                        td: ({ children }) => <td className="px-4 py-2 text-gray-300 border-r border-gray-700 bg-gray-800 last:border-r-0" style={{ backgroundColor: '#49546326' }}>{children}</td>,
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
}
