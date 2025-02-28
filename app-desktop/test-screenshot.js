// Simple test script for screenshot manager
const { app } = require('electron');
const path = require('path');

console.log('🧪 TEST SCRIPT STARTING');

// Wait for app to be ready
app.whenReady().then(() => {
  console.log('📱 APP IS READY');
  
  try {
    console.log('🔍 ATTEMPTING TO REQUIRE SCREENSHOT MANAGER');
    const { screenshotManager } = require('./dist/main/lib/screenshot');
    console.log('✅ SCREENSHOT MANAGER LOADED:', screenshotManager);
    
    console.log('📸 ATTEMPTING TO START SCREENSHOTS');
    screenshotManager.startCapturing();
    console.log('✅ SCREENSHOT CAPTURE STARTED');
    
    // Keep the app running for a bit to see if screenshots are taken
    setTimeout(() => {
      console.log('⏱️ TEST COMPLETE, EXITING');
      app.quit();
    }, 20000); // Run for 20 seconds
  } catch (error) {
    console.log('❌ TEST ERROR:', error);
    app.quit();
  }
}); 