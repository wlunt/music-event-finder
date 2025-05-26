// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Music Event Finder API is running',
    timestamp: new Date().toISOString()
  });
});

// Simple events search route (for testing)
app.post('/api/events/search', (req, res) => {
  const { location, genre, date } = req.body;
  
  console.log(`🔍 Search request: ${genre} in ${location} on ${date}`);
  
  // Return mock data for now
  res.json({
    success: true,
    message: 'Backend is working!',
    searchParams: { location, genre, date },
    events: [
      {
        id: 1,
        title: "Backend Test Event",
        artist: "API Test Band",
        venue: "Test Venue",
        location: location,
        date: date,
        genre: genre,
        source: "Backend API"
      }
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});