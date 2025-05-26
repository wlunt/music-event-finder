// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import our event service
const eventService = require('./services/eventService');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Music Event Finder API is running',
    timestamp: new Date().toISOString()
  });
});

// Real events search using our service
app.post('/api/events/search', async (req, res) => {
  try {
    const { location, genre, date } = req.body;
    
    if (!location || !genre || !date) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['location', 'genre', 'date']
      });
    }

    console.log(`🔍 Searching for events: ${genre} in ${location} on ${date}`);
    
    // Call our real event service
    const events = await eventService.searchEvents({ location, genre, date });
    
    res.json({
      success: true,
      count: events.length,
      events: events,
      searchParams: { location, genre, date }
    });
    
  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({
      error: 'Failed to search events',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});