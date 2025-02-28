import { ipcRenderer } from 'electron/renderer';

export interface Screenshot {
  id: number;
  timestamp: number;
  image_data: string;
  uploaded: number;
}

export class ScreenshotService {
  async getScreenshots(limit: number = 10): Promise<Screenshot[]> {
    try {
      console.log(`Requesting ${limit} screenshots from main process`);
      const screenshots = await ipcRenderer.invoke('get-screenshots', limit);
      console.log(`Received ${screenshots.length} screenshots`);
      return screenshots;
    } catch (error) {
      console.error('Error getting screenshots:', error);
      return [];
    }
  }

  startCapturing(): Promise<void> {
    return ipcRenderer.invoke('start-screenshots');
  }

  stopCapturing(): Promise<void> {
    return ipcRenderer.invoke('stop-screenshots');
  }

  clearScreenshots(): Promise<void> {
    return ipcRenderer.invoke('clear-screenshots');
  }
} 