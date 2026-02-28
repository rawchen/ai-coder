import { DiffResult } from '../types';
import { Equal, Minus, Plus } from 'lucide-react';

interface DiffViewerProps {
  diff: DiffResult;
  viewMode?: 'split' | 'unified';
  isDark: boolean;
}

export function DiffViewer({diff, viewMode = 'unified', isDark}: DiffViewerProps) {
  const {filename, additions, deletions, changes} = diff;

  if (viewMode === 'split') {
    return (
      <div className={`rounded-lg overflow-hidden border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
        <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{filename}</span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-400">
              <Plus size={12}/> {additions}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <Minus size={12}/> {deletions}
            </span>
          </div>
        </div>

        <div className={`grid grid-cols-2 divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-300'}`}>
          {/* 原始版本 */}
          <div>
            <div className={`px-3 py-1 text-xs border-b ${isDark ? 'bg-gray-800/50 text-gray-400 border-gray-700' : 'bg-gray-50/50 text-gray-600 border-gray-300'}`}>
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
                    <span className={`select-none w-10 text-right pr-3 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {change.lineNumber}
                    </span>
                    <span className={`flex-1 font-mono ${
                      change.type === 'remove' ? 'text-red-300' : (isDark ? 'text-gray-300' : 'text-gray-800')
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
            <div className={`px-3 py-1 text-xs border-b ${isDark ? 'bg-gray-800/50 text-gray-400 border-gray-700' : 'bg-gray-50/50 text-gray-600 border-gray-300'}`}>
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
                    <span className={`select-none w-10 text-right pr-3 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {change.lineNumber}
                    </span>
                    <span className={`flex-1 font-mono ${
                      change.type === 'add' ? 'text-green-300' : (isDark ? 'text-gray-300' : 'text-gray-800')
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
    <div className={`rounded-lg overflow-hidden border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{filename}</span>
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
                {change.type === 'add' && <Plus size={14} className="text-green-400"/>}
                {change.type === 'remove' && <Minus size={14} className="text-red-400"/>}
                {change.type === 'unchanged' && <Equal size={14} className={isDark ? 'text-gray-600' : 'text-gray-400'}/>}
              </span>
              <span className={`select-none w-10 text-right pr-3 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {change.lineNumber}
              </span>
              <span className={`flex-1 font-mono ${
                change.type === 'add'
                  ? 'text-green-300'
                  : change.type === 'remove'
                    ? 'text-red-300'
                    : (isDark ? 'text-gray-300' : 'text-gray-800')
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
