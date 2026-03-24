import { Conversation } from '../types';
import { MessageSquare, Plus, Trash2, Search, X, Loader2 } from 'lucide-react';
import { formatDate } from '../services/storage';
import { useState, useRef, useEffect, useCallback } from 'react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedCount, setDisplayedCount] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const LOAD_MORE_THRESHOLD = 200; // 距离底部多少像素时触发加载

  // 搜索过滤对话
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    // 搜索标题
    if (conv.title.toLowerCase().includes(query)) return true;

    // 搜索消息内容
    if (conv.messages.some(msg => msg.content.toLowerCase().includes(query))) return true;

    return false;
  });

  // 当前显示的对话
  const displayedConversations = filteredConversations.slice(0, displayedCount);
  const hasMore = filteredConversations.length > displayedCount;

  // 加载更多对话
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    // 模拟异步加载，避免频繁触发
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + 20, filteredConversations.length));
      setIsLoading(false);
    }, 100);
  }, [isLoading, hasMore, filteredConversations.length]);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    // 当距离底部小于阈值时加载更多
    if (distanceToBottom < LOAD_MORE_THRESHOLD) {
      loadMore();
    }
  }, [isLoading, hasMore, loadMore]);

  // 监听搜索变化，重置显示数量
  useEffect(() => {
    setDisplayedCount(20);
  }, [searchQuery]);

  // 添加滚动监听
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 计算匹配的消息数量
  const getMatchCount = (conv: Conversation): number => {
    if (!searchQuery.trim()) return 0;
    const query = searchQuery.toLowerCase();
    return conv.messages.filter(msg => msg.content.toLowerCase().includes(query)).length;
  };

  // 处理新建对话
  const handleNewConversation = () => {
    if (searchQuery) {
      setSearchQuery('');
    }
    onNew();

    // 滚动到顶部
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }, 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 新建对话按钮 */}
      <div className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          <Plus size={18}/>
          新建对话
        </button>
      </div>

      {/* 搜索框 */}
      <div className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="relative">
          <Search
            size={16}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
          />
          <input
            type="text"
            placeholder="搜索对话或消息..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-9 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors ${
                isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-400'
              }`}
            >
              <X size={14}/>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            找到 {filteredConversations.length} 个对话 {displayedCount < filteredConversations.length && `(显示 ${displayedCount})`}
          </div>
        )}
      </div>

      {/* 对话列表 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className={`p-4 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <MessageSquare size={40} className="mx-auto mb-2 opacity-50"/>
            <p className="text-sm">
              {searchQuery ? '未找到匹配的对话' : '暂无对话'}
            </p>
            <p className="text-xs mt-1">
              {searchQuery ? '尝试其他关键词' : '点击上方按钮开始新对话'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {displayedConversations.map(conv => {
              const matchCount = getMatchCount(conv);
              return (
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
                    <div className={`text-sm truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {matchCount > 0 && searchQuery ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                          {matchCount}
                        </span>
                      ) : null}
                      {conv.title}
                    </div>
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
              );
            })}

            {/* 加载更多指示器 */}
            {hasMore && (
              <div className="p-4 flex items-center justify-center">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 size={16} className="animate-spin"/>
                    <span>加载中...</span>
                  </div>
                ) : (
                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                    已显示 {displayedCount}/{filteredConversations.length} 个对话，继续滚动加载更多
                  </div>
                )}
              </div>
            )}
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
