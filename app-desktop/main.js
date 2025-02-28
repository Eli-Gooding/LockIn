const { app, BrowserWindow, desktopCapturer, systemPreferences, session, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

// Handle promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'LockIn',
    icon: path.join(__dirname, 'src/assets/LockedIn_Logo_Rounded.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      // Enable remote module for dev tools
      enableRemoteModule: true
    }
  });

  // Set up screen recording permissions handler
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Set up screen recording permissions handler with error handling
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ 
      types: ['screen'],
      thumbnailSize: { width: 0, height: 0 }
    }).then((sources) => {
      if (sources && sources.length > 0) {
        callback({ video: sources[0], audio: false });
      } else {
        console.error('No screen sources found');
        callback({ error: new Error('No screen sources available') });
      }
    }).catch((error) => {
      console.error('Error getting screen sources:', error);
      callback({ error });
    });
  }, { useSystemPicker: true });

  // Check screen recording permission on macOS with error handling
  if (process.platform === 'darwin') {
    try {
      const hasScreenCapturePermission = systemPreferences.getMediaAccessStatus('screen');
      console.log('Screen capture permission status:', hasScreenCapturePermission);
      
      if (hasScreenCapturePermission !== 'granted') {
        // This will trigger the permission dialog
        await desktopCapturer.getSources({ types: ['screen'] });
      }
    } catch (error) {
      console.error('Error checking screen capture permissions:', error);
    }
  }

  // In development, load from webpack dev server
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
      await mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
      mainWindow.show();
    } catch (error) {
      console.error('Failed to load file:', error);
      app.quit();
    }
  }

  mainWindow.setTitle('LockIn');
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    // On macOS, set the dock icon
    app.dock.setIcon(path.join(__dirname, 'src/assets/LockedIn_Logo_Rounded.png'));
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
}); 