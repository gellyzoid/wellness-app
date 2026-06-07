import { create } from 'zustand'

interface AiStore {
  overviewText: string
  overviewDays: number | null
  recText: string
  recDays: number | null
  setOverview: (text: string, days: number) => void
  appendOverview: (chunk: string) => void
  setRec: (text: string, days: number) => void
  appendRec: (chunk: string) => void
  clearOverview: (days: number) => void
  clearRec: (days: number) => void
}

export const useAiStore = create<AiStore>((set) => ({
  overviewText: '',
  overviewDays: null,
  recText: '',
  recDays: null,
  setOverview: (text, days) => set({ overviewText: text, overviewDays: days }),
  appendOverview: (chunk) => set((s) => ({ overviewText: s.overviewText + chunk })),
  setRec: (text, days) => set({ recText: text, recDays: days }),
  appendRec: (chunk) => set((s) => ({ recText: s.recText + chunk })),
  clearOverview: (days) => set({ overviewText: '', overviewDays: days }),
  clearRec: (days) => set({ recText: '', recDays: days }),
}))
