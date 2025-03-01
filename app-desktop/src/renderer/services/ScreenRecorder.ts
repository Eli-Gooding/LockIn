export class ScreenRecorder {
  private isRecording: boolean = false;

  async startRecording(): Promise<void> {
    this.isRecording = true;
    console.log('Screen recording started');
  }

  async takeScreenshot(): Promise<string> {
    try {
      console.log('Taking screenshot...');
      const sources = await window.electronAPI.getScreenSources();
      
      if (!sources || sources.length === 0) {
        throw new Error('No screen sources found');
      }

      const mainScreen = sources[0];
      console.log('Screenshot captured successfully');
      return mainScreen.thumbnailDataURL;
    } catch (error) {
      console.error('Error taking screenshot:', error);
      throw error;
    }
  }

  stopRecording(): void {
    this.isRecording = false;
    console.log('Screen recording stopped');
  }

  isActive(): boolean {
    return this.isRecording;
  }
} 
  