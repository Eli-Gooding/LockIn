import { desktopCapturer } from 'electron';
import { Database } from 'sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './logger';

interface ScreenshotData {
  timestamp: number;
  imageBase64: string;
  currentGoal?: string;
}

interface AIAnalysisResponse {
  imageDescription: string;
  nudge: string | null;
  timestamp: number;
}

export interface StoredScreenshot {
  id: number;
  timestamp: number;
  image_description: string;
  current_goal: string;
  nudge: string | null;
}

export class ScreenshotManager {
  private db: Database;
  private captureInterval: NodeJS.Timeout | null = null;
  private readonly CAPTURE_INTERVAL = 180000; // 3 minutes
  private currentGoal: string | null = null;

  constructor() {
    console.log('🎥 SCREENSHOT MANAGER INITIALIZING');
    logger.info("Initializing ScreenshotManager..."); // Our logger
    
    // Initialize SQLite database
    const dbPath = path.join(app.getPath('userData'), 'screenshots.db');
    console.log('💾 Database path:', dbPath);
    logger.info("Database path:", dbPath); // Our logger
    
    this.db = new Database(dbPath);
    this.initDatabase();
    console.log('✅ SCREENSHOT MANAGER INITIALIZED');
  }

  private initDatabase() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        image_description TEXT,
        current_goal TEXT,
        nudge TEXT
      )
    `);
  }

  public setCurrentGoal(goal: string) {
    this.currentGoal = goal;
    logger.info("Current goal set:", goal);
  }

  public startCapturing() {
    console.log('🎬 START CAPTURING CALLED');
    
    if (this.captureInterval) {
      console.log('⚠️ Capture already running');
      return;
    }

    console.log('⏰ Setting up capture interval');
    this.captureInterval = setInterval(async () => {
      console.log('📸 TAKING SCREENSHOT NOW');
      try {
        const screenshot = await this.captureScreen();
        const recentDescriptions = await this.getRecentDescriptions(15); // Last 15 minutes
        
        // Send to server for analysis
        const analysis = await this.sendForAnalysis({
          screenshot,
          currentGoal: this.currentGoal,
          recentDescriptions
        });

        // Save analysis results
        await this.saveAnalysis(analysis);

        // If there's a nudge, emit an event for the UI
        if (analysis.nudge) {
          // We'll implement this IPC communication later
          this.emitNudge(analysis.nudge);
        }

        console.log('✅ Screenshot processed successfully');
      } catch (error) {
        console.error('❌ Screenshot error:', error);
        logger.error('Screenshot error:', error);
      }
    }, this.CAPTURE_INTERVAL);
    console.log('✅ Capture interval set up successfully');
  }

  private async getRecentDescriptions(minutes: number): Promise<{ timestamp: number; description: string }[]> {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT timestamp, image_description FROM screenshots WHERE timestamp > ? ORDER BY timestamp DESC',
        [cutoffTime],
        (err, rows) => {
          if (err) {
            logger.error('Error getting recent descriptions:', err);
            reject(err);
          } else {
            resolve(rows as { timestamp: number; description: string }[]);
          }
        }
      );
    });
  }

  private async sendForAnalysis(data: {
    screenshot: ScreenshotData;
    currentGoal: string | null;
    recentDescriptions: { timestamp: number; description: string }[];
  }): Promise<AIAnalysisResponse> {
    try {
      logger.debug('Sending screenshot for analysis...');
      const response = await fetch('http://localhost:8000/analyze-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          screenshot: data.screenshot.imageBase64,
          currentGoal: data.currentGoal,
          recentDescriptions: data.recentDescriptions.map(desc => ({
            timestamp: desc.timestamp,
            description: desc.description
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      logger.debug('Analysis received from server');
      return result as AIAnalysisResponse;
    } catch (error) {
      logger.error('Error sending screenshot for analysis:', error);
      throw error;
    }
  }

  private async saveAnalysis(analysis: AIAnalysisResponse): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO screenshots (timestamp, image_description, current_goal, nudge) VALUES (?, ?, ?, ?)',
        [analysis.timestamp, analysis.imageDescription, this.currentGoal, analysis.nudge],
        (err) => {
          if (err) {
            logger.error('Error saving analysis to database:', err);
            reject(err);
          } else {
            logger.debug('Analysis saved to local database');
            resolve();
          }
        }
      );
    });
  }

  private emitNudge(nudge: string) {
    logger.info('Nudge received:', nudge);
    const { Notification } = require('electron');

    // Check if we have permission to show notifications
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: '🎯 LockIn Reminder',
        body: nudge,
        silent: false, // Will play a sound
        urgency: 'normal',
        timeoutType: 'default'
      });

      notification.show();

      // Handle notification click
      notification.on('click', () => {
        // Bring the app window to front
        const { BrowserWindow } = require('electron');
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const mainWindow = windows[0];
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      });
    } else {
      logger.error('System notifications are not supported');
    }

    // Also send to the renderer for in-app display
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('nudge-received', nudge);
    }
  }

  public stopCapturing() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
      console.log('🛑 Screenshot capture stopped');
    }
  }

  private async captureScreen(): Promise<ScreenshotData> {
    logger.debug('Capturing screen...');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (!sources || sources.length === 0) {
      throw new Error('No screen sources found');
    }

    const mainScreen = sources[0];
    const imageBase64 = mainScreen.thumbnail.toDataURL();
    logger.debug('Screen capture successful');

    return {
      timestamp: Date.now(),
      imageBase64
    };
  }

  public clearDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM screenshots', (err) => {
        if (err) {
          logger.error('Error clearing database:', err);
          reject(err);
        } else {
          logger.debug('Database cleared successfully');
          resolve();
        }
      });
    });
  }

  public getScreenshots(limit: number = 10): Promise<StoredScreenshot[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM screenshots ORDER BY timestamp DESC LIMIT ?',
        [limit],
        (err, rows) => {
          if (err) {
            logger.error('Error retrieving screenshots:', err);
            reject(err);
          } else {
            logger.debug(`Retrieved ${rows.length} screenshots`);
            resolve(rows as StoredScreenshot[]);
          }
        }
      );
    });
  }
}

export const screenshotManager = new ScreenshotManager(); 