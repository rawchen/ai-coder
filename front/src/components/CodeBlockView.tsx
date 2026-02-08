import { useState } from 'react';
import { Copy, Check, Download, ArrowLeftRight, FileCode } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';

interface CodeBlockViewProps {
  code: string;
  language: string;
  filename?: string;
  onCopy?: (code: string) => void;
  onApply?: () => void;
  onDownload?: () => void;
}

export function CodeBlockView({ code, language, filename, onCopy, onApply, onDownload }: CodeBlockViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `code.${getFileExtension(language)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDownload?.();
  };

  const getFileExtension = (lang: string): string => {
    const extensions: { [key: string]: string } = {
      javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
      go: 'go', rust: 'rs', sql: 'sql', bash: 'sh', json: 'json',
      css: 'css', html: 'html', markup: 'html'
    };
    return extensions[lang] || 'txt';
  };

  // 映射语言名称到 Prism 支持的语言
  const getPrismLanguage = (lang: string): string => {
    const mapping: { [key: string]: string } = {
      js: 'javascript', ts: 'typescript', py: 'python',
      jsx: 'javascript', tsx: 'typescript', sh: 'bash',
      html: 'markup', xml: 'markup'
    };
    return mapping[lang] || lang;
  };

  const prismLang = getPrismLanguage(language);
  let highlighted = code;

  try {
    if (Prism.languages[prismLang]) {
      highlighted = Prism.highlight(code, Prism.languages[prismLang], prismLang);
    }
  } catch {
    // 如果高亮失败，使用原始代码
  }

  const lines = highlighted.split('\n');

  return (
    <div className="rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-gray-400" />
          <span className="text-sm text-gray-300">{filename || language}</span>
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-700 rounded">{language}</span>
        </div>
        <div className="flex items-center gap-1 group">
          {onApply && (
            <div className="relative">
              <button
                onClick={onApply}
                className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded transition-colors"
                title="对比差异"
              >
                <ArrowLeftRight size={14} />
              </button>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                对比差异
              </span>
            </div>
          )}
          <div className="relative">
            <button
              onClick={handleDownload}
              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
              title="下载"
            >
              <Download size={14} />
            </button>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              下载文件
            </span>
          </div>
          <div className="relative">
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title={copied ? '已复制' : '复制'}
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {copied ? '已复制' : '复制代码'}
            </span>
          </div>
        </div>
      </div>

      {/* 代码内容 */}
      <div className="overflow-x-auto prose-pre">
        <pre className="p-4 text-sm leading-relaxed">
          <code className="font-mono">
            {lines.map((line, index) => (
              <div key={index} className="flex">
                <span className="select-none text-gray-600 w-10 text-right pr-4 flex-shrink-0">
                  {index + 1}
                </span>
                <span
                  className="flex-1 text-gray-100"
                  dangerouslySetInnerHTML={{ __html: line || ' ' }}
                />
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}