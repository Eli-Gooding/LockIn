interface Window {
  electronAPI: {
    send: (channel: string, data: any) => void;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (...args: any[]) => void) => void;
  }
}

interface ImageBitmap {
  readonly width: number;
  readonly height: number;
  close(): void;
}

declare class ImageCapture {
  constructor(videoTrack: MediaStreamTrack);
  grabFrame(): Promise<ImageBitmap>;
  takePhoto(): Promise<Blob>;
} 