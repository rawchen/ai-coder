import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeBlock, Message, MessageContent } from '../types';
import { CodeBlockView } from './CodeBlockView';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';

// Mermaid 切换开关组件
const MermaidSwitch = ({showText, onToggle, isDark}: { showText: boolean; onToggle: () => void; isDark: boolean }) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`absolute top-3 right-3 z-10 flex rounded-2xl overflow-hidden cursor-pointer select-none ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200'}`}
      onClick={onToggle}
    >
      {/* 滑动背景 */}
      <div
        ref={sliderRef}
        className={`absolute top-0 h-full rounded-2xl transition-transform duration-200 ease-in-out ${isDark ? 'bg-gray-500' : 'bg-gray-400'}`}
        style={{
          width: '50%',
          transform: showText ? 'translateX(100%)' : 'translateX(0)',
        }}
      />
      <div
        className={`relative z-10 pl-2 pr-2 py-1 text-xs font-medium transition-colors duration-200 ${!showText ? 'text-white' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
        图表
      </div>
      <div
        className={`relative z-10 pl-2 pr-2 py-1 text-xs font-medium transition-colors duration-200 ${showText ? 'text-white' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
        文本
      </div>
    </div>
  );
};

// Mermaid 灯箱组件
const MermaidLightbox = ({svg, isDark, onClose}: { svg: string; isDark: boolean; onClose: () => void }) => {
  const lightboxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({x: 0, y: 0});
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({x: 0, y: 0});
  const offsetStart = useRef({x: 0, y: 0});
  const initialScaleSet = useRef(false);

  // ESC 退出灯箱
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 计算初始缩放使图表适应视口
  useEffect(() => {
    if (initialScaleSet.current) return;
    const svgEl = lightboxRef.current?.querySelector('svg');
    if (!svgEl) return;

    // 强制浏览器重新计算 SVG 尺寸
    const rect = svgEl.getBoundingClientRect();
    const svgW = rect.width;
    const svgH = rect.height;
    if (svgW <= 0 || svgH <= 0) return;

    const padding = 40;
    const maxW = window.innerWidth - padding;
    const maxH = window.innerHeight - padding;
    const fitScale = Math.min(maxW / svgW, maxH / svgH);
    setScale(fitScale);
    initialScaleSet.current = true;
  }, [svg]);

  const handleExportPng = useCallback(() => {
    const svgEl = lightboxRef.current?.querySelector('svg');
    if (!svgEl) return;

    // 克隆 SVG，内联样式使 foreignObject 中文字可正常渲染
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const width = svgEl.getAttribute('width') || svgEl.viewBox?.baseVal?.width?.toString() || '800';
    const height = svgEl.getAttribute('height') || svgEl.viewBox?.baseVal?.height?.toString() || '600';

    // 确保有明确尺寸
    if (!clone.getAttribute('width')) clone.setAttribute('width', width);
    if (!clone.getAttribute('height')) clone.setAttribute('height', height);

    // 收集页面中所有样式表规则，内联到 SVG 的 foreignObject 中
    const styleRules: string[] = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          styleRules.push(rule.cssText);
        }
      } catch {
        // 跨域样式表无法读取，跳过
      }
    }
    // 为 foreignObject 内部注入内联样式
    const inlineStyle = `<style>${styleRules.join('\n')}</style>`;
    clone.querySelectorAll('foreignObject').forEach(fo => {
      const body = fo.querySelector('body') || fo.querySelector('div');
      if (body) {
        body.insertAdjacentHTML('afterbegin', inlineStyle);
      } else {
        fo.insertAdjacentHTML('afterbegin', inlineStyle);
      }
    });

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const dpr = 2;
        canvas.width = img.naturalWidth * dpr;
        canvas.height = img.naturalHeight * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.fillStyle = isDark ? '#1f2937' : '#ffffff';
          ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
          ctx.drawImage(img, 0, 0);
        }
        canvas.toBlob((blob) => {
          if (blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'mermaid-chart.png';
            a.click();
            URL.revokeObjectURL(a.href);
          }
        }, 'image/png');
      } catch {
        // canvas 被污染时降级为导出 SVG
        handleExportSvg();
      }
    };
    img.onerror = () => {
      // data URL 加载失败时降级为导出 SVG
      handleExportSvg();
    };
    img.src = dataUrl;
  }, [isDark]);

  const handleExportSvg = useCallback(() => {
    const svgEl = lightboxRef.current?.querySelector('svg');
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mermaid-chart.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 0.2), 5));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {x: e.clientX, y: e.clientY};
    offsetStart.current = {...offset};
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleReset = useCallback(() => {
    const svgEl = lightboxRef.current?.querySelector('svg');
    if (svgEl) {
      const rect = svgEl.getBoundingClientRect();
      const svgW = rect.width / scale;
      const svgH = rect.height / scale;
      if (svgW > 0 && svgH > 0) {
        const padding = 40;
        const maxW = window.innerWidth - padding;
        const maxH = window.innerHeight - padding;
        setScale(Math.min(maxW / svgW, maxH / svgH));
        setOffset({x: 0, y: 0});
        return;
      }
    }
    setScale(1);
    setOffset({x: 0, y: 0});
  }, [scale]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{backgroundColor: 'rgba(0,0,0,0.75)'}}
      onClick={onClose}
    >
      {/* 工具栏 */}
      <div
        className="absolute top-4 right-4 z-50 flex items-center gap-2"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setScale(s => Math.min(s + 0.2, 5))}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
        >+
        </button>
        <span
          className={`text-sm min-w-[3rem] text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale(s => Math.max(s - 0.2, 0.2))}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
        >−
        </button>
        <button
          onClick={handleReset}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
        >重置
        </button>
        <button
          onClick={handleExportPng}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isDark ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
        >导出 PNG
        </button>
        <button
          onClick={handleExportSvg}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isDark ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
        >导出 SVG
        </button>
        <button
          onClick={onClose}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
        >✕
        </button>
      </div>

      {/* 图表区域 */}
      <div
        ref={lightboxRef}
        className="cursor-grab active:cursor-grabbing select-none overflow-visible"
        style={{transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center center'}}
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        dangerouslySetInnerHTML={{__html: svg}}
      />
    </div>
  );
};

// Mermaid 渲染组件
const MermaidBlock = memo(function MermaidBlock({chart, isDark, id}: { chart: string; isDark: boolean; id?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showText, setShowText] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    const renderChart = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const {svg: renderedSvg} = await mermaid.render(id, chart.trim());
        setSvg(renderedSvg);
        setError('');
      } catch (err) {
        setError('流程图渲染失败');
        console.error('Mermaid render error:', err);
      }
    };
    renderChart();
  }, [chart, isDark]);

  if (error && showText) {
    return (
      <div id={id} className={`relative rounded-lg overflow-hidden ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
        <MermaidSwitch showText={showText} onToggle={() => setShowText(false)} isDark={isDark}/>
        <pre className={`p-4 pr-28 text-sm overflow-x-auto ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{chart}</pre>
      </div>
    );
  }

  if (error) {
    return (
      <div id={id} className="relative rounded-lg">
        <MermaidSwitch showText={showText} onToggle={() => setShowText(true)} isDark={isDark}/>
        <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {error}
        </div>
      </div>
    );
  }

  if (showText) {
    return (
      <div id={id} className={`relative rounded-lg overflow-hidden ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
        <MermaidSwitch showText={showText} onToggle={() => setShowText(false)} isDark={isDark}/>
        <pre className={`p-4 pr-28 text-sm overflow-x-auto ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{chart}</pre>
      </div>
    );
  }

  return (
    <div id={id} className="relative rounded-lg">
      <MermaidSwitch showText={showText} onToggle={() => setShowText(true)} isDark={isDark}/>
      <div
        ref={containerRef}
        className={`overflow-x-auto p-4 rounded-lg cursor-pointer hover:ring-2 hover:ring-gray-400/50 transition-all ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}
        dangerouslySetInnerHTML={{__html: svg}}
        onClick={() => setShowLightbox(true)}
      />
      {showLightbox && svg && (
        <MermaidLightbox svg={svg} isDark={isDark} onClose={() => setShowLightbox(false)}/>
      )}
    </div>
  );
});

interface ChatMessageProps {
  message: Message;
  onApplyCode?: (code: CodeBlock) => void;
  onCopyCode?: (code: string) => void;
  isDark: boolean;
}

// 解析消息中的代码块（包括未完成的代码块）
// 支持3个及以上反引号的代码块，以及 md/markdown 包裹中的嵌套代码块
function parseContent(content: string | MessageContent[]): Array<{
  type: 'text' | 'code';
  content: string;
  language?: string;
  filename?: string;
  incomplete?: boolean
}> {
  // 如果content是数组格式，返回空数组（用户消息直接显示，不需要解析）
  if (Array.isArray(content)) {
    return [];
  }

  const result = parseCodeBlocks(content, false);
  return result.length > 0 ? result : [{type: 'text' as const, content}];
}

// 使用非贪婪方式匹配任意数量(>=3)反引号的代码块，确保开闭反引号数量一致
function parseCodeBlocks(content: string, isInner: boolean): Array<{
  type: 'text' | 'code';
  content: string;
  language?: string;
  filename?: string;
  incomplete?: boolean
}> {
  const parts: Array<{
    type: 'text' | 'code';
    content: string;
    language?: string;
    filename?: string;
    incomplete?: boolean
  }> = [];

  let pos = 0;
  // 匹配3个及以上反引号开头，允许前面有空白缩进，记录反引号数量，要求闭合时数量一致
  const openRegex = /([ \t]*)(`{3,})(\w+)?(?:\s*\/\/\s*(.+))?\n/g;

  while (pos < content.length) {
    openRegex.lastIndex = pos;
    const openMatch = openRegex.exec(content);

    if (!openMatch) {
      // 没有更多代码块，添加剩余文本
      if (pos < content.length) {
        const text = content.slice(pos);
        if (text) parts.push({type: 'text', content: text});
      }
      break;
    }

    const backticks = openMatch[2];
    const lang = openMatch[3] || 'plaintext';
    const filename = openMatch[4]?.trim();
    const codeStart = openMatch.index + openMatch[0].length;

    // 添加代码块之前的文本
    if (openMatch.index > pos) {
      const text = content.slice(pos, openMatch.index);
      if (text) parts.push({type: 'text', content: text});
    }

    // 查找匹配的闭合反引号（数量与开头一致，允许前面有空白缩进）
    const escapedBackticks = backticks.replace(/`/g, '\\`');
    const closeRegex = new RegExp(`\\n[ \\t]*${escapedBackticks}(?=\\s*\\n|$)`);
    const closeMatch = closeRegex.exec(content.slice(codeStart));

    if (closeMatch) {
      // 找到闭合，完整代码块
      const codeContent = content.slice(codeStart, codeStart + closeMatch.index);
      const trimmedCode = codeContent.trim();

      // 如果是 md/markdown 包裹，递归解析其内部内容
      if ((lang === 'md' || lang === 'markdown') && !isInner) {
        const innerParts = parseCodeBlocks(trimmedCode, true);
        parts.push(...innerParts);
      } else {
        parts.push({
          type: 'code',
          language: lang,
          filename,
          content: trimmedCode,
          incomplete: false
        });
      }

      pos = codeStart + closeMatch.index + closeMatch[0].length;
    } else {
      // 未找到闭合，可能是流式输出中的未完成代码块
      const codeContent = content.slice(codeStart).trim();
      parts.push({
        type: 'code',
        language: lang,
        filename,
        content: codeContent,
        incomplete: true
      });
      break;
    }
  }

  return parts;
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

        <div className={`space-y-3 overflow-visible ${isDark ? 'text-gray-50' : 'text-gray-800'}`}>
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
                    <div className={`prose max-w-none break-words ${isDark ? 'prose-invert' : ''}`}>
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
                    <MermaidBlock key={index} chart={part.content} isDark={isDark} id={`${message.id}-${index}`}/>
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
                  <div key={index} className={`prose max-w-none break-words ${isDark ? 'prose-invert' : ''}`}>
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