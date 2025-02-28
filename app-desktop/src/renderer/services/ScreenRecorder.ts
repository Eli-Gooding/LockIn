export class ScreenRecorder {
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private recordingInterval: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  private async retry<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying operation, ${retries} attempts remaining...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retry(operation, retries - 1);
      }
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    try {
      // First check if we already have a stream
      if (this.stream) {
        console.log('Screen recording already active');
        return;
      }

      console.log('Requesting screen capture...');
      
      // Request screen capture with more flexible constraints for dev mode
      const stream = await this.retry(async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
              displaySurface: 'monitor'
            } as MediaTrackConstraints,
            audio: false
          });

          if (!mediaStream || !mediaStream.getVideoTracks().length) {
            throw new Error('No video track available in the stream');
          }

          return mediaStream;
        } catch (error) {
          console.error('Error in getDisplayMedia:', error);
          throw error;
        }
      });

      // Verify we have a valid stream
      if (!stream || !stream.getVideoTracks().length) {
        throw new Error('Failed to get valid screen capture stream');
      }

      // Add stream stop handler
      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing stopped by user');
        this.stopRecording();
      };

      this.stream = stream;
      this.isRecording = true;
      console.log('Screen recording started successfully');

    } catch (error) {
      console.error('Error starting screen recording:', error);
      if (error instanceof Error) {
        // Provide more detailed error information
        if (error.name === 'NotAllowedError') {
          throw new Error('Screen recording permission denied by user');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Could not start screen recording (hardware/OS error)');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No screen recording device found');
        }
      }
      throw new Error('Failed to start screen recording: ' + (error as Error).message);
    }
  }

  async takeScreenshot(): Promise<string> {
    if (!this.stream) {
      throw new Error('Screen recording not started');
    }

    try {
      console.log('Taking screenshot...');
      const videoTrack = this.stream.getVideoTracks()[0];
      
      if (!videoTrack) {
        throw new Error('No video track available');
      }

      return await this.retry(async () => {
        const imageCapture = new ImageCapture(videoTrack);
        const bitmap = await imageCapture.grabFrame();
        
        // Create a canvas to draw the frame
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Failed to get canvas context');
        }
        
        context.drawImage(bitmap, 0, 0);
        console.log('Screenshot taken successfully');
        return canvas.toDataURL('image/png');
      });
    } catch (error) {
      console.error('Error taking screenshot:', error);
      throw new Error('Failed to take screenshot: ' + (error as Error).message);
    }
  }

  stopRecording(): void {
    console.log('Stopping screen recording...');
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          try {
            track.stop();
            console.log(`Stopped track: ${track.kind}`);
          } catch (error) {
            console.error(`Error stopping track ${track.kind}:`, error);
          }
        });
        this.stream = null;
      }
      
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }
    } catch (error) {
      console.error('Error in stopRecording:', error);
    } finally {
      this.isRecording = false;
      console.log('Screen recording stopped');
    }
  }

  isActive(): boolean {
    return this.isRecording;
  }
} 