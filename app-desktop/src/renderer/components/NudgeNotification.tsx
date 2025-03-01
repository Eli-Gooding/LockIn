import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../utils';

// Use the exposed electronAPI in your component:
export const NudgeNotification: React.FC = () => {
  const [nudge, setNudge] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // Request notification permissions on component mount
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Initial notification permission:', permission);
      });
    }
  }, []);

  useEffect(() => {
    console.log('🔔 Setting up nudge listener');
    
    const handleNudge = (_event: any, message: string) => {
      console.log('🔔 Nudge received in renderer:', message);
      
      if (message) {
        console.log('🔔 Setting nudge state');
        setNudge(message);
        setIsVisible(true);
        
        // Only flash in-app if the window is focused
        // System-level flashing is handled by the main process
        if (document.hasFocus()) {
          setIsFlashing(true);
          
          // Stop flashing after 3 seconds
          setTimeout(() => {
            console.log('🔔 Stopping in-app flash effect');
            setIsFlashing(false);
          }, 3000);
        }

        // Auto-hide notification after 10 seconds
        setTimeout(() => {
          console.log('🔔 Auto-hiding in-app notification');
          setIsVisible(false);
        }, 10000);
      }
    };

    if (!window.electronAPI) {
      console.error('❌ electronAPI not found in window object');
      return;
    }

    window.electronAPI.on('nudge-received', handleNudge);
    console.log('🔔 Nudge listener registered');

    return () => {
      console.log('🔔 Cleaning up nudge listener');
      window.electronAPI.removeListener('nudge-received', handleNudge);
    };
  }, []);

  const handleClose = () => {
    console.log('🔔 Manually closing notification');
    setIsVisible(false);
    setIsFlashing(false);
  };

  return (
    <>
      {/* In-app screen flash effect - only shown when app is focused */}
      <AnimatePresence>
        {isFlashing && (
          <>
            {/* Red border flash effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, repeat: 5, repeatType: "reverse" }}
              className="fixed inset-0 pointer-events-none"
              style={{
                boxShadow: "inset 0 0 150px rgba(255, 0, 0, 0.9)",
                zIndex: 999999
              }}
            />
            {/* Additional corner flashes for more visibility */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, repeat: 5, repeatType: "reverse", delay: 0.1 }}
              className="fixed top-0 left-0 w-40 h-40 pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(255,0,0,0.7) 0%, rgba(255,0,0,0) 70%)",
                zIndex: 999999
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, repeat: 5, repeatType: "reverse", delay: 0.1 }}
              className="fixed top-0 right-0 w-40 h-40 pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(255,0,0,0.7) 0%, rgba(255,0,0,0) 70%)",
                zIndex: 999999
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, repeat: 5, repeatType: "reverse", delay: 0.1 }}
              className="fixed bottom-0 left-0 w-40 h-40 pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(255,0,0,0.7) 0%, rgba(255,0,0,0) 70%)",
                zIndex: 999999
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, repeat: 5, repeatType: "reverse", delay: 0.1 }}
              className="fixed bottom-0 right-0 w-40 h-40 pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(255,0,0,0.7) 0%, rgba(255,0,0,0) 70%)",
                zIndex: 999999
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* In-app notification popup */}
      <AnimatePresence>
        {isVisible && nudge && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'fixed top-4 right-4 max-w-md p-4 bg-gray-900/95 border border-gray-700 rounded-lg shadow-lg',
              'backdrop-blur-sm text-white z-[1000000]'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-medium mb-1">Friendly Reminder</h3>
                <p className="text-sm text-gray-300">{nudge}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}; 