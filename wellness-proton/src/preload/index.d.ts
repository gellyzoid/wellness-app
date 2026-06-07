import { ElectronAPI } from '@electron-toolkit/preload'
import type { WellnessApi } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: WellnessApi
  }
}
