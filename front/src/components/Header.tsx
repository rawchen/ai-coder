import { Code2, FileText, Github, Image as ImageIcon, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  onExportPdf: () => void;
  onExportImage: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export function Header({
  onExportPdf,
  onExportImage,
  onToggleTheme,
  isDark,
}: HeaderProps) {
  return (
    <header
      className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 dark:bg-gray-900 dark:border-gray-700 light:bg-white light:border-gray-200">
      {/* Logo */}
      <div
        className="flex items-center gap-3 cursor-pointer px-2 py-1 rounded-lg transition-colors"
        onClick={() => window.location.reload()}
      >
        <div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Code2 size={20} className="text-white"/>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white dark:text-white light:text-gray-900">AiCoder</h1>
          <p className="text-xs text-gray-500 -mt-0.5">智能编程平台</p>
        </div>
      </div>

      {/* 功能按钮 */}
      <div className="flex items-center gap-2">

        <button
          onClick={onExportImage}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 light:text-gray-600 light:hover:text-gray-900 light:hover:bg-gray-100"
          title="导出为图片"
        >
          <ImageIcon size={16}/>
          <span className="hidden sm:inline">图片</span>
        </button>

        <button
          onClick={onExportPdf}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 light:text-gray-600 light:hover:text-gray-900 light:hover:bg-gray-100"
          title="导出 PDF"
        >
          <FileText size={16}/>
          <span className="hidden sm:inline">PDF</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 light:text-gray-600 light:hover:text-gray-900 light:hover:bg-gray-100"
          title={isDark ? "切换到白天模式" : "切换到夜间模式"}
        >
          {isDark ? <Sun size={16}/> : <Moon size={16}/>}
          {/*<span className="hidden sm:inline">{isDark ? "" : ""}</span>*/}
        </button>

        <div className="w-px h-6 bg-gray-700 mx-2 dark:bg-gray-700 light:bg-gray-300"/>

        <a
          href="https://github.com/rawchen/ai-coder"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 light:text-gray-600 light:hover:text-gray-900 light:hover:bg-gray-100"
          title="GitHub"
        >
          <Github size={18}/>
        </a>
      </div>
    </header>
  );
}
