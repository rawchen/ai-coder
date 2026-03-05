// 滚动事件类型
export type ScrollEventType = 
  | 'clickButtonToScrollToBottom'
  | 'forceScrollToBottomTrigger';

// 滚动事件参数
export interface ScrollEvent {
  method: ScrollEventType;
  args: any;
}

// 简单的事件总线实现
class EventBus {
  private subscribers: ((event: ScrollEvent) => void)[] = [];

  subscribe(subscriber: (event: ScrollEvent) => void) {
    this.subscribers.push(subscriber);
    return () => {
      const index = this.subscribers.indexOf(subscriber);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  unsubscribe(subscriber: (event: ScrollEvent) => void) {
    const index = this.subscribers.indexOf(subscriber);
    if (index > -1) {
      this.subscribers.splice(index, 1);
    }
  }

  next(event: ScrollEvent) {
    this.subscribers.forEach(handler => handler(event));
  }
}

export const scrollEventBus = new EventBus();
