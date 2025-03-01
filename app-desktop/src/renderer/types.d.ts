// Global type definitions for the app

interface Window {
  electronAPI: {
    on: (channel: string, listener: (...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (...args: any[]) => void) => void;
    send: (channel: string, data: any) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    getScreenSources: () => Promise<any>;
  };
} 