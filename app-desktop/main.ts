import { app, BrowserWindow, desktopCapturer, systemPreferences, session, ipcMain, Notification } from 'electron';
import * as path from 'path';
// Add proper TypeScript import
import { screenshotManager } from './lib/screenshot';
import { logger } from './lib/logger';

// Add the NotificationPermission type
type NotificationPermission = 'default' | 'denied' | 'granted';

// Add immediate log when file loads
console.log("Main process starting...");
logger.info("Main process starting with logger...");

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
    icon: path.join(__dirname, '../src/assets/LockedIn_Logo_Rounded.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
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
        callback({ video: sources[0] });
      } else {
        console.error('No screen sources found');
        callback({});
      }
    }).catch((error) => {
      console.error('Error getting screen sources:', error);
      callback({});
    });
  });

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
      // Always open DevTools in development mode
      mainWindow.webContents.openDevTools();
      console.log('🔍 DevTools opened for debugging');
    } catch (error) {
      console.error('Failed to load URL:', error);
      app.quit();
    }
  } else {
    try {
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      mainWindow.show();
    } catch (error) {
      console.error('Failed to load file:', error);
      app.quit();
    }
  }

  mainWindow.setTitle('LockIn');
}

// Add VERY obvious debug logs
console.log('🚀 MAIN PROCESS STARTING');

app.whenReady().then(() => {
  console.log('📱 APP IS READY');
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../src/assets/LockedIn_Logo_Rounded.png'));
  }

  // Check notification support and permissions on macOS
  if (process.platform === 'darwin') {
    try {
      if (Notification.isSupported()) {
        const permissionStatus = systemPreferences.getMediaAccessStatus('screen');
        console.log('🔔 Notification support status:', permissionStatus);
        
        // Test notification
        new Notification({
          title: '🎯 LockIn',
          body: 'App is ready and notifications are working!'
        }).show();
      }
    } catch (error) {
      console.error('❌ Error checking notification support:', error);
    }
  }

  createWindow();
  
  // Add super obvious debug for screenshot start
  try {
    console.log('📸 ATTEMPTING TO START SCREENSHOTS');
    screenshotManager.startCapturing();
    console.log('✅ SCREENSHOT CAPTURE STARTED');
  } catch (error) {
    console.log('❌ SCREENSHOT ERROR:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Add IPC handlers for screenshot control
ipcMain.handle('start-screenshots', () => {
  try {
    console.log('📸 Starting screenshot capture from IPC request');
    screenshotManager.startCapturing();
    return { success: true };
  } catch (error) {
    console.error('❌ Error starting screenshots:', error);
    throw error;
  }
});

ipcMain.handle('stop-screenshots', () => {
  try {
    console.log('🛑 Stopping screenshot capture from IPC request');
    screenshotManager.stopCapturing();
    return { success: true };
  } catch (error) {
    console.error('❌ Error stopping screenshots:', error);
    throw error;
  }
});

ipcMain.handle('clear-screenshots', () => {
  try {
    console.log('🗑️ Clearing screenshots from IPC request');
    return screenshotManager.clearDatabase();
  } catch (error) {
    console.error('❌ Error clearing screenshots:', error);
    throw error;
  }
});

// Get screenshots from database
ipcMain.handle('get-screenshots', async (event, limit = 10) => {
  try {
    console.log(`📸 Getting ${limit} screenshots from database`);
    const screenshots = await screenshotManager.getScreenshots(limit);
    console.log(`✅ Retrieved ${screenshots.length} screenshots`);
    return screenshots;
  } catch (error) {
    console.error('❌ Error getting screenshots:', error);
    throw error;
  }
});

// Set current goal
ipcMain.handle('set-current-goal', (event, goal: string) => {
  try {
    console.log('🎯 Setting current goal:', goal);
    screenshotManager.setCurrentGoal(goal);
    return { success: true };
  } catch (error) {
    console.error('❌ Error setting goal:', error);
    throw error;
  }
});

// Send nudge to renderer
function sendNudge(nudge: string) {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].webContents.send('nudge-received', nudge);
  }
}

// Handle app quit
app.on('before-quit', () => {
  screenshotManager.stopCapturing();
  screenshotManager.clearDatabase();
}); 