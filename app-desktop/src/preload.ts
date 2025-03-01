import { contextBridge, ipcRenderer } from 'electron';

// Log when preload script is running
console.log('🔌 Preload script is running');

// Force logs to be visible in dev tools
const enhancedLog = (prefix: string, ...args: any[]) => {
  // Use a distinctive style to make logs more visible
  console.log(`%c${prefix}`, 'background: #222; color: #bada55; padding: 2px 4px; border-radius: 2px;', ...args);
};

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, data: any) => {
    enhancedLog(`🔌 Sending message on channel: ${channel}`, data);
    ipcRenderer.send(channel, data);
  },
  on: (channel: string, listener: (...args: any[]) => void) => {
    enhancedLog(`🔌 Adding listener for channel: ${channel}`);
    ipcRenderer.on(channel, (event, ...args) => {
      enhancedLog(`🔌 Received message on channel: ${channel}`, args);
      listener(event, ...args);
    });
  },
  removeListener: (channel: string, listener: (...args: any[]) => void) => {
    enhancedLog(`🔌 Removing listener for channel: ${channel}`);
    ipcRenderer.removeListener(channel, listener);
  },
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  invoke: (channel: string, ...args: any[]) => {
    enhancedLog(`🔌 Invoking on channel: ${channel}`, args);
    return ipcRenderer.invoke(channel, ...args);
  },
}); 