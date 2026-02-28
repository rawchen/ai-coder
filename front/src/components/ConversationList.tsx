import { Conversation } from '../types';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '../services/storage';

interface ConversationListProps {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isDark: boolean;
}

export function ConversationList({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
  isDark
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 新建对话按钮 */}
      <div className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          <Plus size={18}/>
          新建对话
        </button>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className={`p-4 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <MessageSquare size={40} className="mx-auto mb-2 opacity-50"/>
            <p className="text-sm">暂无对话</p>
            <p className="text-xs mt-1">点击上方按钮开始新对话</p>
          </div>
        ) : (
          <div className="py-2">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`group flex items-center gap-3 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors select-none border ${
                  currentId === conv.id
                    ? 'border-blue-500/30 bg-blue-500/20'
                    : `border-transparent ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200/50'}`
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <MessageSquare size={16} className={`${isDark ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`}/>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{conv.title}</div>
                  <div className={`text-xs flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                    <span>{formatDate(conv.updatedAt)}</span>
                    <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}/>
                    <span>{conv.messages.length}条消息</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${isDark ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400' : 'hover:bg-gray-300 text-gray-500 hover:text-red-500'}`}
                  title="删除对话"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className={`p-3 border-t text-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          数据存储在本地浏览器
        </p>
      </div>
    </div>
  );
}
