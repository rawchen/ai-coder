import { useState } from 'react';
import { FileHistory, ProjectFile } from '../types';
import { ChevronDown, ChevronRight, FileCode, History, RotateCcw, Trash2 } from 'lucide-react';
import { formatDate } from '../services/storage';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onDeleteFile: (fileId: string) => void;
  onRestoreHistory: (file: ProjectFile, history: FileHistory) => void;
  isDark: boolean;
  onJumpToAnchor?: (anchorId: string) => void;
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
  onDeleteFile,
  onRestoreHistory,
  isDark,
  onJumpToAnchor
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
      typescript: 'text-orange-400',
      python: 'text-green-400',
      java: 'text-blue-400',
      go: 'text-cyan-400',
      rust: 'text-orange-500',
      html: 'text-red-400',
      css: 'text-purple-400',
      json: 'text-yellow-300',
      sql: 'text-pink-400',
      c: 'text-blue-500',
      cpp: 'text-blue-500',
      sh: 'text-green-400',
      bash: 'text-green-400',
      shell: 'text-green-400',
      php: 'text-purple-400',
      kotlin: 'text-blue-500',
      swiftsharp: 'text-blue-500',
      ruby: 'text-red-400',
      perl: 'text-red-400',
      lua: 'text-green-400',
      yaml: 'text-green-400',
      toml: 'text-yellow-300',
      markdown: 'text-yellow-300'
    };
    return colors[language] || 'text-gray-400';
  };

  if (files.length === 0) {
    return (
      <div className={`p-4 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        <FileCode size={40} className="mx-auto mb-2 opacity-50"/>
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
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
              selectedFile?.id === file.id ? 'bg-blue-500/20 border-l-2 border-blue-500' : ''
            } ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200/50'}`}
            onClick={() => {
              onSelectFile(file);
              // 如果文件有关联的锚点，跳转到对应的代码块
              if (file.anchorId && onJumpToAnchor) {
                console.log('FileExplorer: Jumping to anchor', file.anchorId, 'for file', file.name);
                onJumpToAnchor(file.anchorId);
              }
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(file.id);
              }}
              className={`p-0.5 rounded ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-300'}`}
            >
              {expandedFiles.has(file.id) ? (
                <ChevronDown size={14} className={isDark ? 'text-gray-400' : 'text-gray-500'}/>
              ) : (
                <ChevronRight size={14} className={isDark ? 'text-gray-400' : 'text-gray-500'}/>
              )}
            </button>

            <FileCode size={14} className={getLanguageColor(file.language)}/>

            <span className={`flex-1 text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{file.name}</span>

            {file.history.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistoryFor(showHistoryFor === file.id ? null : file.id);
                }}
                className={`p-1 rounded hover:text-blue-400 ${isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-300 text-gray-500'}`}
                title="查看历史"
              >
                <History size={12}/>
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(file.id);
              }}
              className={`p-1 rounded hover:text-red-400 ${isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-300 text-gray-500'}`}
              title="删除"
            >
              <Trash2 size={12}/>
            </button>
          </div>

          {/* 文件详情 */}
          {expandedFiles.has(file.id) && (
            <div className={`pl-10 pr-3 py-2 text-xs bg-gray-800/30 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
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
            <div
              className={`ml-6 mr-2 mb-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
              <div
                className={`px-3 py-2 border-b text-xs font-medium ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                修改历史
              </div>
              <div className="max-h-40 overflow-y-auto">
                {file.history.slice().reverse().map(history => (
                  <div
                    key={history.id}
                    className={`flex items-center justify-between px-3 py-2 border-b last:border-0 ${isDark ? 'hover:bg-gray-700/50 border-gray-700/50' : 'hover:bg-gray-200/50 border-gray-200/50'}`}
                  >
                    <div>
                      <div
                        className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{history.description}</div>
                      <div
                        className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{formatDate(new Date(history.timestamp))}</div>
                    </div>
                    <button
                      onClick={() => onRestoreHistory(file, history)}
                      className={`p-1 rounded hover:text-green-400 ${isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                      title="恢复此版本"
                    >
                      <RotateCcw size={12}/>
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
