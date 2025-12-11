import { create } from 'zustand';

interface AppState {
  isChaos: boolean;
  handPosition: { x: number; y: number };
  setChaos: (chaos: boolean) => void;
  setHandPosition: (x: number, y: number) => void;
}

export const useStore = create<AppState>((set) => ({
  isChaos: false,
  handPosition: { x: 0, y: 0 },
  setChaos: (isChaos) => set({ isChaos }),
  setHandPosition: (x, y) => set({ handPosition: { x, y } }),
}));