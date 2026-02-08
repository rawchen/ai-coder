import { Code2, Github, FileDown, FileText, Image as ImageIcon } from 'lucide-react';

interface HeaderProps {
  onExportPdf: () => void;
  onExportZip: () => void;
  onExportImage: () => void;
}

export function Header({
  onExportPdf,
  onExportZip,
  onExportImage,
}: HeaderProps) {
  return (
    <header className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
      {/* Logo */}
      <div
        className="flex items-center gap-3 cursor-pointer px-2 py-1 rounded-lg transition-colors"
        onClick={() => window.location.reload()}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Code2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">AiCoder</h1>
          <p className="text-xs text-gray-500 -mt-0.5">智能编程平台</p>
        </div>
      </div>

      {/* 功能按钮 */}
      <div className="flex items-center gap-2">

        <button
          onClick={onExportImage}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="导出为图片"
        >
          <ImageIcon size={16} />
          <span className="hidden sm:inline">图片</span>
        </button>

        <button
          onClick={onExportPdf}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="导出 PDF"
        >
          <FileText size={16} />
          <span className="hidden sm:inline">PDF</span>
        </button>

        <button
          onClick={onExportZip}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="导出工程文件"
        >
          <FileDown size={16} />
          <span className="hidden sm:inline">ZIP</span>
        </button>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        <a
          href="https://github.com/rawchen"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="GitHub"
        >
          <Github size={18} />
        </a>
      </div>
    </header>
  );
}
