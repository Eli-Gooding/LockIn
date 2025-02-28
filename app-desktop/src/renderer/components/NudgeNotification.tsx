import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../utils';

// Add type definitions for our exposed API, if needed.
declare global {
  interface Window {
    electronAPI: {
      on: (channel: string, listener: (...args: any[]) => void) => void;
      removeListener: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, data: any) => void;
    };
  }
}

// Use the exposed electronAPI in your component:
export const NudgeNotification: React.FC = () => {
  const [nudge, setNudge] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleNudge = (_event: any, message: string) => {
      setNudge(message);
      setIsVisible(true);

      // Auto-hide after 10 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    };

    window.electronAPI.on('nudge-received', handleNudge);

    return () => {
      window.electronAPI.removeListener('nudge-received', handleNudge);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && nudge && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'fixed bottom-4 right-4 max-w-md p-4 bg-gray-900/95 border border-gray-700 rounded-lg shadow-lg',
            'backdrop-blur-sm text-white'
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
  );
}; 