import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { Plus, Minus, CheckCircle2, GripVertical } from 'lucide-react';
import { cn } from './utils';
import { ScreenRecorder } from './services/ScreenRecorder';
import { NudgeNotification } from './components/NudgeNotification';

// Import the types
import './types'; // This will make TypeScript recognize the global Window interface

// Constants
const SCREENSHOT_INTERVAL = 30000; // Take a screenshot every 30 seconds
const MAX_RECENT_DESCRIPTIONS = 5;

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface RecentDescription {
  timestamp: number;
  description: string;
}

export function App() {
  const [appState, setAppState] = useState<'welcome' | 'create' | 'complete' | 'accomplished'>('welcome');
  const [items, setItems] = useState<TodoItem[]>([{ id: '1', text: '', completed: false }]);
  const [screenRecorder] = useState(() => new ScreenRecorder());
  const [recentDescriptions, setRecentDescriptions] = useState<RecentDescription[]>([]);

  // Find the first uncompleted item
  const firstUncompletedIndex = items.findIndex((item) => !item.completed);

  // Handle screen recording based on app state
  useEffect(() => {
    const handleScreenRecording = async () => {
      try {
        if (appState === 'complete' && !screenRecorder.isActive()) {
          console.log('Starting screen recording for complete state');
          await screenRecorder.startRecording();
        } else if (appState !== 'complete' && screenRecorder.isActive()) {
          console.log('Stopping screen recording as state changed from complete');
          screenRecorder.stopRecording();
        }
      } catch (error) {
        console.error('Screen recording error:', error);
        // You might want to show a user-friendly error message here
      }
    };

    handleScreenRecording();

    // Cleanup on unmount
    return () => {
      if (screenRecorder.isActive()) {
        console.log('Cleanup: stopping screen recording');
        screenRecorder.stopRecording();
      }
    };
  }, [appState, screenRecorder]);

  // Handle screenshot intervals
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const takeScreenshot = async () => {
      try {
        console.log('Taking screenshot...');
        const screenshot = await screenRecorder.takeScreenshot();
        console.log('Screenshot taken, sending to backend for analysis...');
        
        // Analyze the screenshot
        const analysisResponse = await fetch('http://localhost:8000/analyze-screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            screenshot,
            currentGoal: items[firstUncompletedIndex]?.text,
            recentDescriptions,
          }),
        });

        if (!analysisResponse.ok) {
          throw new Error(`Failed to analyze screenshot: ${analysisResponse.status} ${analysisResponse.statusText}`);
        }

        console.log('Got analysis response, processing...');
        const analysisData = await analysisResponse.json();
        console.log('Analysis data:', analysisData);
        
        // Update recent descriptions with the new one
        setRecentDescriptions(prev => {
          const newDescription = {
            timestamp: Date.now(),
            description: analysisData.imageDescription
          };
          const updated = [newDescription, ...prev].slice(0, MAX_RECENT_DESCRIPTIONS);
          console.log('Updated recent descriptions:', updated);
          return updated;
        });

        // If there's a nudge message, ensure it's displayed as a system notification
        if (analysisData.nudge && analysisData.nudge.trim() !== '') {
          console.log('Received nudge message, sending system notification:', analysisData.nudge);
          
          try {
            // Send the nudge message to the main process to show a system notification
            window.electronAPI.send('show-notification', {
              title: 'LockIn Reminder',
              body: analysisData.nudge
            });
            console.log('System notification sent successfully');
          } catch (error) {
            console.error('Failed to send system notification:', error);
          }
        } else {
          console.log('No nudge message received from server');
        }
      } catch (error) {
        console.error('Screenshot error:', error);
        // Don't stop the interval on error, just log it
      }
    };

    // Only set up the interval if we're in the 'complete' state
    if (appState === 'complete') {
      console.log('Setting up screenshot interval in complete state');
      // Take first screenshot immediately
      takeScreenshot();
      // Then set up interval
      intervalId = setInterval(takeScreenshot, SCREENSHOT_INTERVAL);
      console.log('Screenshot interval set up');
    }

    return () => {
      if (intervalId) {
        console.log('Cleaning up screenshot interval');
        clearInterval(intervalId);
      }
    };
  }, [appState, screenRecorder, items, firstUncompletedIndex, recentDescriptions]);

  // Reset recent descriptions when starting a new session
  useEffect(() => {
    if (appState === 'complete') {
      setRecentDescriptions([]);
    }
  }, [appState]);

  // Add effect to check for completion
  useEffect(() => {
    if (appState === 'complete' && items.length > 0 && items.every(item => item.completed)) {
      console.log('All items completed, transitioning to accomplished state in 2 seconds');
      // Add a 2-second delay before transitioning to accomplished state
      const timer = setTimeout(() => {
        console.log('Transitioning to accomplished state now');
        setAppState('accomplished');
      }, 2000);

      // Clean up timer if component unmounts or state changes
      return () => {
        console.log('Cleaning up completion timer');
        clearTimeout(timer);
      };
    }
  }, [items, appState]);

  // Update current goal when active item changes
  useEffect(() => {
    if (appState === 'complete') {
      const currentGoal = items[firstUncompletedIndex]?.text;
      if (currentGoal) {
        window.electronAPI.send('set-current-goal', currentGoal);
      }
    }
  }, [items, appState, firstUncompletedIndex]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), text: '', completed: false }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItemText = (id: string, text: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const toggleComplete = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  // Add this function to test notifications
  const testNotification = async () => {
    console.log('Testing system notification...');
    try {
      // Use invoke to call the test-notification handler
      const result = await window.electronAPI.invoke('test-notification');
      console.log('Test notification result:', result);
      
      if (!result.success) {
        console.error('Test notification failed:', result.message);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      
      // Fallback to using send if invoke fails
      try {
        console.log('Trying fallback method for test notification...');
        window.electronAPI.send('show-notification', {
          title: 'LockIn Test',
          body: 'This is a test notification using fallback method.'
        });
      } catch (fallbackError) {
        console.error('Fallback notification also failed:', fallbackError);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      {/* Add test button in development mode */}
      {process.env.NODE_ENV !== 'production' && (
        <button
          onClick={testNotification}
          className="fixed bottom-4 left-4 px-3 py-1 bg-red-600 text-white text-xs rounded-md z-50"
        >
          Test System Notification
        </button>
      )}
      
      <AnimatePresence mode="wait">
        {appState === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <button
              onClick={() => setAppState('create')}
              className="w-full p-6 rounded-lg border border-gray-800 bg-gray-900/50 text-center text-xl font-medium shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300"
            >
              Ready to lock in?
            </button>
          </motion.div>
        )}

        {appState === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <h1 className="text-2xl font-bold mb-6 text-center text-white/90">Create Your Action Items</h1>

            <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-3">
              {items.map((item, index) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className="flex items-center gap-3"
                >
                  <div className="flex items-center gap-3 w-full">
                    <button className="cursor-grab active:cursor-grabbing p-1">
                      <GripVertical size={16} className="text-gray-500" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-400">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateItemText(item.id, e.target.value)}
                      placeholder="Enter task..."
                      className="flex-1 bg-gray-900/50 border border-gray-800 rounded-lg p-3 shadow-[0_0_10px_rgba(255,255,255,0.05)] focus:shadow-[0_0_15px_rgba(255,255,255,0.15)] outline-none transition-all"
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/50 border border-red-900/50 text-red-500 shadow-[0_0_10px_rgba(255,0,0,0.2)] hover:shadow-[0_0_15px_rgba(255,0,0,0.3)] transition-all"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <div className="mt-6 flex flex-col gap-4">
              <button
                onClick={addItem}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all"
              >
                <Plus size={16} />
                Add Step
              </button>

              <button
                onClick={() => {
                  if (items.some(item => item.text.trim() === '')) {
                    alert('Please fill in all tasks before proceeding');
                    return;
                  }
                  setAppState('complete');
                }}
                className="p-3 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all"
              >
                Complete List
              </button>
            </div>
          </motion.div>
        )}

        {appState === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <h1 className="text-2xl font-bold mb-6 text-center text-white/90">Your Action Items</h1>

            <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-3">
              {items.map((item, index) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900/50 transition-all',
                    index === firstUncompletedIndex &&
                      !item.completed &&
                      'border-gray-600 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  )}
                >
                  <button className="cursor-grab active:cursor-grabbing p-1">
                    <GripVertical size={16} className="text-gray-500" />
                  </button>
                  <button
                    onClick={() => toggleComplete(item.id)}
                    className={cn(
                      'w-6 h-6 rounded-full border flex items-center justify-center transition-all',
                      item.completed
                        ? 'border-green-500 text-green-500 shadow-[0_0_10px_rgba(0,255,0,0.2)]'
                        : 'border-gray-600 text-transparent'
                    )}
                  >
                    {item.completed && <CheckCircle2 size={16} />}
                  </button>
                  <span className={cn('flex-1', item.completed && 'text-gray-500 line-through')}>
                    {item.text || 'Untitled task'}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-500 text-xs">
                    {index + 1}
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <button
              onClick={() => setAppState('create')}
              className="mt-6 w-full p-3 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all"
            >
              Edit List
            </button>
          </motion.div>
        )}

        {appState === 'accomplished' && (
          <motion.div
            key="accomplished"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-md flex flex-col items-center"
          >
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-3xl font-bold mb-6 text-center text-white"
            >
              Mission Accomplished
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-12"
            >
              <button
                onClick={() => {
                  setAppState('welcome');
                  setItems([{ id: '1', text: '', completed: false }]);
                }}
                className="px-6 py-3 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-300 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all"
              >
                More to get done?
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <NudgeNotification />
    </div>
  );
} 