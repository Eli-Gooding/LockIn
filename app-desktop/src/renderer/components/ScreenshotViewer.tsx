import React, { useState, useEffect } from 'react';
import { Screenshot, ScreenshotService } from '../services/ScreenshotService';

interface ScreenshotViewerProps {
  limit?: number;
  refreshInterval?: number;
}

export const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({ 
  limit = 10,
  refreshInterval = 5000 // Refresh every 5 seconds
}) => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const screenshotService = new ScreenshotService();

  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      const data = await screenshotService.getScreenshots(limit);
      setScreenshots(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching screenshots:', err);
      setError('Failed to load screenshots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('ScreenshotViewer component mounted');
    fetchScreenshots();

    // Set up interval to refresh screenshots
    const intervalId = setInterval(fetchScreenshots, refreshInterval);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [limit, refreshInterval]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading && screenshots.length === 0) {
    return <div className="p-4 text-center">Loading screenshots...</div>;
  }

  if (error && screenshots.length === 0) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (screenshots.length === 0) {
    return (
      <div className="p-4 text-center">
        <p>No screenshots available.</p>
        <p className="text-sm text-gray-500">Screenshots are taken automatically every few seconds.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Recent Screenshots ({screenshots.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {screenshots.map((screenshot) => (
          <div key={screenshot.id} className="border border-gray-700 rounded-lg overflow-hidden">
            <div className="p-2 bg-gray-800 text-sm">
              <div>ID: {screenshot.id}</div>
              <div>Time: {formatDate(screenshot.timestamp)}</div>
              <div>Uploaded: {screenshot.uploaded ? 'Yes' : 'No'}</div>
            </div>
            <img 
              src={screenshot.image_data} 
              alt={`Screenshot ${screenshot.id}`}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>
    </div>
  );
}; 