import { useState } from 'react';
import { ProjectFile, FileHistory } from '../types';
import { FileCode, ChevronRight, ChevronDown, History, Trash2, RotateCcw } from 'lucide-react';
import { formatDate } from '../services/storage';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onDeleteFile: (fileId: string) => void;
  onRestoreHistory: (file: ProjectFile, history: FileHistory) => void;
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
  onDeleteFile,
  onRestoreHistory
}: FileExplorerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

  const toggleExpand = (fileId: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const getLanguageColor = (language: string): string => {
    const colors: { [key: string]: string } = {
      javascript: 'text-yellow-400',
      typescript: 'text-blue-400',
      python: 'text-green-400',
      java: 'text-orange-400',
      go: 'text-cyan-400',
      rust: 'text-orange-500',
      html: 'text-red-400',
      css: 'text-purple-400',
      json: 'text-yellow-300',
      sql: 'text-pink-400'
    };
    return colors[language] || 'text-gray-400';
  };

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FileCode size={40} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无文件</p>
        <p className="text-xs mt-1">上传文件或生成代码后将在此显示</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {files.map(file => (
        <div key={file.id}>
          {/* 文件项 */}
          <div
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-700/50 transition-colors ${
              selectedFile?.id === file.id ? 'bg-blue-500/20 border-l-2 border-blue-500' : ''
            }`}
            onClick={() => onSelectFile(file)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(file.id);
              }}
              className="p-0.5 hover:bg-gray-600 rounded"
            >
              {expandedFiles.has(file.id) ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronRight size={14} className="text-gray-400" />
              )}
            </button>

            <FileCode size={14} className={getLanguageColor(file.language)} />

            <span className="flex-1 text-sm text-gray-300 truncate">{file.name}</span>

            {file.history.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistoryFor(showHistoryFor === file.id ? null : file.id);
                }}
                className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-blue-400"
                title="查看历史"
              >
                <History size={12} />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(file.id);
              }}
              className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400"
              title="删除"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* 文件详情 */}
          {expandedFiles.has(file.id) && (
            <div className="pl-10 pr-3 py-2 text-xs text-gray-500 bg-gray-800/30">
              <div className="flex gap-4">
                <span>语言: {file.language}</span>
                <span>行数: {file.content.split('\n').length}</span>
                {file.history.length > 0 && (
                  <span>修改: {file.history.length}次</span>
                )}
              </div>
            </div>
          )}

          {/* 历史记录 */}
          {showHistoryFor === file.id && file.history.length > 0 && (
            <div className="ml-6 mr-2 mb-2 bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-3 py-2 border-b border-gray-700 text-xs text-gray-400 font-medium">
                修改历史
              </div>
              <div className="max-h-40 overflow-y-auto">
                {file.history.slice().reverse().map(history => (
                  <div
                    key={history.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-700/50 border-b border-gray-700/50 last:border-0"
                  >
                    <div>
                      <div className="text-xs text-gray-300">{history.description}</div>
                      <div className="text-xs text-gray-500">{formatDate(new Date(history.timestamp))}</div>
                    </div>
                    <button
                      onClick={() => onRestoreHistory(file, history)}
                      className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-green-400"
                      title="恢复此版本"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
