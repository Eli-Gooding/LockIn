import { app, BrowserWindow, desktopCapturer, systemPreferences, session, ipcMain, Notification, screen } from 'electron';
import * as path from 'path';
// Add proper TypeScript import
import { screenshotManager } from './lib/screenshot';
import { logger } from './lib/logger';

// Add the NotificationPermission type
type NotificationPermission = 'default' | 'denied' | 'granted';

// Add immediate log when file loads
console.log("Main process starting...");
logger.info("Main process starting with logger...");

// Development mode check
const isDev = process.env.NODE_ENV === 'development';

// Handle promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

async function createWindow() {
  console.log('Creating main window...');
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'LockIn',
    icon: path.join(__dirname, '../src/assets/LockedIn_Logo_Rounded.png'),
    webPreferences: {
      preload: path.join(__dirname, './preload.js'), // Updated preload path
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false // Required for IPC to work properly
    }
  });

  console.log('Preload script path:', path.join(__dirname, './preload.js'));

  // Set up screen recording permissions handler
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'notifications') {
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

// Set app ID for Windows notifications
if (process.platform === 'win32') {
  app.setAppUserModelId('com.lockin.app');
}

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

// Add IPC handlers for screenshot control
ipcMain.handle('get-screen-sources', async () => {
  try {
    console.log('Getting screen sources...');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    console.log(`Found ${sources.length} screen sources`);
    
    // Convert the sources to a format safe for IPC
    const processedSources = sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnailDataURL: source.thumbnail.toDataURL(),
      display_id: source.display_id
    }));
    
    return processedSources;
  } catch (error) {
    console.error('Error getting screen sources:', error);
    throw error;
  }
});

// Create a function to show a screen flash
function showScreenFlash() {
  try {
    console.log('🔴 Creating screen flash effect');
    
    // Get all displays
    const displays = screen.getAllDisplays();
    console.log(`🔴 Found ${displays.length} displays for flash effect`);
    
    if (displays.length === 0) {
      console.error('❌ No displays found for flash effect');
      return false;
    }
    
    const flashWindows: BrowserWindow[] = [];
    
    // Create a flash window for each display
    displays.forEach((display, index) => {
      const { bounds } = display;
      console.log(`🔴 Creating flash for display ${index + 1} at ${bounds.x},${bounds.y} (${bounds.width}x${bounds.height})`);
      
      // Create a transparent, frameless window that covers the entire display
      const flashWindow = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      // Load the flash HTML content with more intense effect
      const flashHTML = `
        <html>
          <head>
            <style>
              body {
                margin: 0;
                padding: 0;
                overflow: hidden;
                background-color: transparent;
              }
              .flash {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                box-shadow: inset 0 0 200px rgba(255, 0, 0, 0.95);
                pointer-events: none;
                animation: flash 0.15s alternate infinite 15;
              }
              .corner {
                position: absolute;
                width: 250px;
                height: 250px;
                background: radial-gradient(circle, rgba(255,0,0,0.9) 0%, rgba(255,0,0,0) 70%);
                pointer-events: none;
                animation: flash 0.15s alternate infinite 15;
              }
              .top-left {
                top: 0;
                left: 0;
              }
              .top-right {
                top: 0;
                right: 0;
              }
              .bottom-left {
                bottom: 0;
                left: 0;
              }
              .bottom-right {
                bottom: 0;
                right: 0;
              }
              @keyframes flash {
                from { opacity: 0.3; }
                to { opacity: 1; }
              }
            </style>
          </head>
          <body>
            <div class="flash"></div>
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
            <script>
              // Force the window to be visible and on top
              window.addEventListener('load', () => {
                console.log('Flash window loaded');
              });
            </script>
          </body>
        </html>
      `;
      
      // Load the HTML content
      flashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(flashHTML)}`);
      
      // Show the window once it's ready
      flashWindow.once('ready-to-show', () => {
        console.log(`🔴 Showing flash on display ${index + 1}`);
        flashWindow.showInactive(); // Show without focusing
      });
      
      // Store the window reference
      flashWindows.push(flashWindow);
    });
    
    // Clean up flash windows after 3 seconds
    setTimeout(() => {
      console.log('🔴 Cleaning up flash windows');
      for (let i = 0; i < flashWindows.length; i++) {
        try {
          const window = flashWindows[i];
          if (window && !window.isDestroyed()) {
            window.close();
          }
        } catch (error) {
          console.error('Error closing flash window:', error);
        }
      }
    }, 3000);
    
    return flashWindows.length > 0;
  } catch (error) {
    console.error('❌ Error showing screen flash:', error);
    return false;
  }
}

// Add this near the other IPC handlers
ipcMain.on('show-notification', (event, { title, body }) => {
  try {
    console.log('🔔 Showing system notification:', { title, body });
    
    if (!title || !body) {
      console.error('❌ Invalid notification data: title or body is missing');
      return;
    }
    
    // Always send the nudge to the renderer for in-app display
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      try {
        console.log('📢 About to send nudge to renderer:', body);
        windows[0].webContents.send('nudge-received', body);
        console.log('✅ Nudge sent to renderer');
        
        // Force log to appear in dev tools
        if (isDev) {
          windows[0].webContents.executeJavaScript(`console.log("🔔 Nudge received in main process:", ${JSON.stringify(body)})`);
        }
      } catch (error) {
        console.error('❌ Error sending nudge to renderer:', error);
      }
    } else {
      console.warn('⚠️ No windows found to send nudge to renderer');
    }
    
    // Create a system-level screen flash
    try {
      console.log('🔴 Attempting to create screen flash effect');
      const flashResult = showScreenFlash();
      console.log('✅ Screen flash result:', flashResult);
    } catch (error) {
      console.error('❌ Error showing screen flash:', error);
    }
    
    // Check if system notifications are supported
    if (Notification.isSupported()) {
      console.log('✅ System notifications are supported');
      
      try {
        // Platform-specific notification options
        const notificationOptions: Electron.NotificationConstructorOptions = {
          title,
          body,
          silent: false,
          urgency: 'critical',
          timeoutType: 'never',
          // Add icon for better visibility
          icon: path.join(__dirname, '../src/assets/LockedIn_Logo_Rounded.png')
        };
        
        // Add platform-specific options
        if (process.platform === 'darwin') {
          // macOS specific options
          notificationOptions.subtitle = 'Time to focus!';
          notificationOptions.hasReply = false;
          notificationOptions.sound = 'Basso'; // Use a system sound
          console.log('✅ Added macOS specific options');
        } else if (process.platform === 'win32') {
          // Windows specific options - no specific options needed
          // The appID is set at the app level, not per notification
          console.log('✅ Using Windows notification settings');
        }
        
        // Create a system notification
        const notification = new Notification(notificationOptions);
        
        // Add event listeners for notification events
        notification.on('show', () => {
          console.log('🔔 System notification shown');
        });
        
        notification.on('click', () => {
          console.log('🔔 System notification clicked');
          // Focus the window when notification is clicked
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            const mainWindow = windows[0];
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.flashFrame(false); // Stop flashing if it was flashing
          }
        });
        
        notification.on('close', () => {
          console.log('🔔 System notification closed');
        });
        
        notification.on('failed', (error) => {
          console.error('❌ System notification failed:', error);
        });
        
        // Show the notification
        notification.show();
        console.log('✅ System notification shown');
        
        // Flash the taskbar/dock icon to get user's attention
        if (windows.length > 0) {
          try {
            const mainWindow = windows[0];
            // Flash the frame (taskbar/dock) to get attention
            mainWindow.flashFrame(true);
            console.log('✅ Started flashing taskbar/dock icon');
            
            // Stop flashing after 5 seconds
            setTimeout(() => {
              try {
                if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isFocused()) {
                  mainWindow.flashFrame(false);
                  console.log('✅ Stopped flashing taskbar/dock icon');
                }
              } catch (error) {
                console.error('❌ Error stopping frame flash:', error);
              }
            }, 5000);
          } catch (error) {
            console.error('❌ Error flashing taskbar/dock icon:', error);
          }
        } else {
          console.warn('⚠️ No windows found to flash taskbar/dock icon');
        }
      } catch (error) {
        console.error('❌ Error creating or showing notification:', error);
      }
    } else {
      console.error('❌ System notifications are not supported');
    }
  } catch (error) {
    console.error('❌ Error showing notification:', error);
  }
});

// Add a test notification handler
ipcMain.handle('test-notification', async (event) => {
  try {
    console.log('🧪 Sending test notification');
    
    // Create a system-level screen flash
    try {
      console.log('🔴 Attempting to create test screen flash effect');
      const flashResult = showScreenFlash();
      console.log('✅ Test screen flash result:', flashResult);
      
      // If flash failed, log a detailed error
      if (!flashResult) {
        console.error('❌ Screen flash failed but did not throw an error');
      }
    } catch (error) {
      console.error('❌ Error showing test screen flash:', error);
    }
    
    // Also send to renderer for in-app display
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      try {
        console.log('📢 About to send test nudge to renderer');
        windows[0].webContents.send('nudge-received', 'This is a test notification. If you see this, notifications are working!');
        console.log('✅ Test nudge sent to renderer');
        
        // Force log to appear in dev tools
        if (isDev) {
          windows[0].webContents.executeJavaScript(`
            console.log("%c🔔 Test nudge received in renderer", "background: #222; color: #bada55; padding: 2px 4px; border-radius: 2px;", "This is a test notification. If you see this, notifications are working!");
          `);
        }
      } catch (error) {
        console.error('❌ Error sending test nudge to renderer:', error);
      }
    } else {
      console.warn('⚠️ No windows found to send test nudge to renderer');
    }
    
    // Create and show a system notification
    if (Notification.isSupported()) {
      console.log('✅ System notifications are supported for test');
      
      try {
        // Platform-specific notification options
        const notificationOptions: Electron.NotificationConstructorOptions = {
          title: 'LockIn Test',
          body: 'This is a test notification. If you see this, system notifications are working!',
          silent: false,
          urgency: 'critical',
          timeoutType: 'never',
          icon: path.join(__dirname, '../src/assets/LockedIn_Logo_Rounded.png')
        };
        
        // Add platform-specific options
        if (process.platform === 'darwin') {
          // macOS specific options
          notificationOptions.subtitle = 'Test notification';
          notificationOptions.hasReply = false;
          notificationOptions.sound = 'Basso'; // Use a system sound
          console.log('✅ Added macOS specific options for test');
        } else if (process.platform === 'win32') {
          // Windows specific options - no specific options needed
          // The appID is set at the app level, not per notification
          console.log('✅ Using Windows notification settings for test');
        }
        
        const notification = new Notification(notificationOptions);
        notification.show();
        console.log('✅ Test system notification shown');
        
        // Flash the taskbar/dock icon
        if (windows.length > 0) {
          try {
            windows[0].flashFrame(true);
            console.log('✅ Started flashing taskbar/dock icon for test');
            
            // Stop flashing after 5 seconds
            setTimeout(() => {
              try {
                if (windows[0] && !windows[0].isDestroyed() && !windows[0].isFocused()) {
                  windows[0].flashFrame(false);
                  console.log('✅ Stopped flashing taskbar/dock icon for test');
                }
              } catch (error) {
                console.error('❌ Error stopping frame flash for test:', error);
              }
            }, 5000);
          } catch (error) {
            console.error('❌ Error flashing taskbar/dock icon for test:', error);
          }
        } else {
          console.warn('⚠️ No windows found to flash taskbar/dock icon for test');
        }
      } catch (error) {
        console.error('❌ Error creating or showing test notification:', error);
      }
    } else {
      console.error('❌ System notifications are not supported for test');
    }
    
    return { success: true, message: 'Test notification sent successfully' };
  } catch (error: any) {
    console.error('❌ Error in test-notification handler:', error);
    return { success: false, message: `Test notification failed: ${error.message || String(error)}` };
  }
}); 