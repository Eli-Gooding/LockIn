const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(`[LockIn] ${message}`, ...args);
    }
  },
  
  error: (message: string, error?: any) => {
    if (isDev) {
      console.error(`[LockIn] Error: ${message}`, error || '');
    }
  },

  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`[LockIn] Debug: ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (isDev) {
      console.warn(`[LockIn] Warning: ${message}`, ...args);
    }
  }
}; 