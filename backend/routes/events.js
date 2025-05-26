// backend/routes/events.js
const express = require('express');
const router = express.Router();
const eventService = require('../services/eventService');

// Search events endpoint
router.post('/search', async (req, res) => {
  try {
    const { location, genre, date } = req.body;
    
    // Validate required fields
    if (!location || !genre || !date) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['location', 'genre', 'date']
      });
    }

    console.log(`🔍 Searching for events: ${genre} in ${location} on ${date}`);
    
    // Call our event service to aggregate results
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

// Get events from specific platform
router.get('/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { location, genre, date } = req.query;
    
    const events = await eventService.getEventsByPlatform(platform, { location, genre, date });
    
    res.json({
      success: true,
      platform,
      count: events.length,
      events
    });
    
  } catch (error) {
    console.error(`Error getting events from ${platform}:`, error);
    res.status(500).json({
      error: `Failed to get events from ${platform}`,
      message: error.message
    });
  }
});

module.exports = router;