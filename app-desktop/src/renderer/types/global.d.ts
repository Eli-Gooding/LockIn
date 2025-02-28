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