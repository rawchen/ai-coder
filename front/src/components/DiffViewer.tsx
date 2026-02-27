import { DiffResult } from '../types';
import { Equal, Minus, Plus } from 'lucide-react';

interface DiffViewerProps {
  diff: DiffResult;
  viewMode?: 'split' | 'unified';
}

export function DiffViewer({diff, viewMode = 'unified'}: DiffViewerProps) {
  const {filename, additions, deletions, changes} = diff;

  if (viewMode === 'split') {
    return (
      <div className="rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-sm text-gray-300 font-medium">{filename}</span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-400">
              <Plus size={12}/> {additions}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <Minus size={12}/> {deletions}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-gray-700">
          {/* 原始版本 */}
          <div>
            <div className="px-3 py-1 bg-gray-800/50 text-xs text-gray-400 border-b border-gray-700">
              原始版本
            </div>
            <div className="overflow-x-auto">
              <pre className="text-sm">
                {changes.filter(c => c.type !== 'add').map((change, i) => (
                  <div
                    key={i}
                    className={`flex px-2 py-0.5 ${
                      change.type === 'remove' ? 'bg-red-500/20' : ''
                    }`}
                  >
                    <span className="select-none text-gray-600 w-10 text-right pr-3 flex-shrink-0">
                      {change.lineNumber}
                    </span>
                    <span className={`flex-1 font-mono ${
                      change.type === 'remove' ? 'text-red-300' : 'text-gray-300'
                    }`}>
                      {change.content || ' '}
                    </span>
                  </div>
                ))}
              </pre>
            </div>
          </div>

          {/* 新版本 */}
          <div>
            <div className="px-3 py-1 bg-gray-800/50 text-xs text-gray-400 border-b border-gray-700">
              修改后
            </div>
            <div className="overflow-x-auto">
              <pre className="text-sm">
                {changes.filter(c => c.type !== 'remove').map((change, i) => (
                  <div
                    key={i}
                    className={`flex px-2 py-0.5 ${
                      change.type === 'add' ? 'bg-green-500/20' : ''
                    }`}
                  >
                    <span className="select-none text-gray-600 w-10 text-right pr-3 flex-shrink-0">
                      {change.lineNumber}
                    </span>
                    <span className={`flex-1 font-mono ${
                      change.type === 'add' ? 'text-green-300' : 'text-gray-300'
                    }`}>
                      {change.content || ' '}
                    </span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 统一视图
  return (
    <div className="rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-sm text-gray-300 font-medium">{filename}</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-400">
            <Plus size={12}/> {additions} 新增
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <Minus size={12}/> {deletions} 删除
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <pre className="text-sm">
          {changes.map((change, index) => (
            <div
              key={index}
              className={`flex px-2 py-0.5 ${
                change.type === 'add'
                  ? 'bg-green-500/20'
                  : change.type === 'remove'
                    ? 'bg-red-500/20'
                    : ''
              }`}
            >
              <span className="select-none w-6 text-center flex-shrink-0">
                {change.type === 'add' && <Plus size={14} className="text-green-400 inline"/>}
                {change.type === 'remove' && <Minus size={14} className="text-red-400 inline"/>}
                {change.type === 'unchanged' && <Equal size={14} className="text-gray-600 inline"/>}
              </span>
              <span className="select-none text-gray-600 w-10 text-right pr-3 flex-shrink-0">
                {change.lineNumber}
              </span>
              <span className={`flex-1 font-mono ${
                change.type === 'add'
                  ? 'text-green-300'
                  : change.type === 'remove'
                    ? 'text-red-300'
                    : 'text-gray-300'
              }`}>
                {change.content || ' '}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
