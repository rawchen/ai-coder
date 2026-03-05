import { create } from 'zustand';

interface ScrollStore {
  showScrollBottomButton: boolean;
  setShowScrollBottomButton: (show: boolean) => void;
}

export const useScrollStore = create<ScrollStore>((set) => ({
  showScrollBottomButton: false,
  setShowScrollBottomButton: (show) => set({ showScrollBottomButton: show }),
}));
