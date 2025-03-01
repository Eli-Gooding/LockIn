interface ProcessedScreenSource {
  id: string;
  name: string;
  thumbnailDataURL: string;
  display_id: string;
}

interface ElectronAPI {
  send: (channel: string, data: any) => void;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  removeListener: (channel: string, listener: (...args: any[]) => void) => void;
  getScreenSources: () => Promise<ProcessedScreenSource[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 