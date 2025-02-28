require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// POST endpoint to analyze screenshot with AI
app.post('/analyze', async (req, res) => {
  try {
    const { image, currentTask } = req.body;
    if (!image || !currentTask) {
      return res.status(400).json({ error: 'Missing required fields: image or currentTask' });
    }

    // For now we return dummy data
    // In a real implementation, you would call the OpenAI API or another vision API here
    // using axios and process the response accordingly.

    const dummyResponse = {
      description: "User is on track",
      onTrack: true,
      notification: null
    };

    res.json(dummyResponse);
  } catch (error) {
    console.error('Error processing /analyze request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 