const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'LockIn',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true
    }
  });

  // In development, load from the Next.js development server
  if (isDev) {
    try {
      await mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } catch (error) {
      console.error('Failed to load URL:', error);
      app.quit();
    }
  } else {
    try {
      await mainWindow.loadFile(path.join(__dirname, '.next/server/pages/index.html'));
      mainWindow.show();
    } catch (error) {
      console.error('Failed to load file:', error);
      app.quit();
    }
  }

  mainWindow.setTitle('LockIn');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
}); 