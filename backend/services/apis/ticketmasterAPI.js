// backend/services/apis/ticketmasterAPI.js
const axios = require('axios');

class TicketmasterAPI {
  constructor() {
    this.baseURL = 'https://app.ticketmaster.com/discovery/v2';
    this.apiKey = process.env.TICKETMASTER_API_KEY;
  }

  async searchEvents({ location, genre, date }) {
    if (!this.apiKey) {
      console.log('⚠️ Ticketmaster API key not found');
      return [];
    }

    try {
      console.log(`🎟️ Searching Ticketmaster: ${genre} in ${location} on ${date}`);

      // Convert genre to Ticketmaster classification
      const classificationId = this.getGenreClassification(genre);
      
      // Build search parameters
      const params = {
        apikey: this.apiKey,
        keyword: genre,
        city: location,
        startDateTime: `${date}T00:00:00Z`,
        endDateTime: `${date}T23:59:59Z`,
        size: 50,
        sort: 'relevance,desc'
      };

      // Add classification if we found a match
      if (classificationId) {
        params.classificationId = classificationId;
      }

      const response = await axios.get(`${this.baseURL}/events.json`, {
        params,
        timeout: 10000
      });

      if (response.data && response.data._embedded && response.data._embedded.events) {
        const events = response.data._embedded.events.map(event => this.formatEvent(event));
        console.log(`✅ Ticketmaster found ${events.length} events`);
        return events;
      }

      console.log('ℹ️ No events found on Ticketmaster');
      return [];

    } catch (error) {
      console.error('❌ Ticketmaster API error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return [];
    }
  }

  formatEvent(tmEvent) {
    // Extract venue information
    let venue = 'Unknown Venue';
    let eventLocation = 'Unknown Location';
    
    if (tmEvent._embedded && tmEvent._embedded.venues && tmEvent._embedded.venues[0]) {
      const venueData = tmEvent._embedded.venues[0];
      venue = venueData.name;
      
      if (venueData.city && venueData.country) {
        eventLocation = `${venueData.city.name}, ${venueData.country.name}`;
      }
    }

    // Extract price information
    let price = 'Price TBA';
    if (tmEvent.priceRanges && tmEvent.priceRanges[0]) {
      const priceRange = tmEvent.priceRanges[0];
      const currency = priceRange.currency || 'USD';
      const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
      
      if (priceRange.min && priceRange.max) {
        price = `${symbol}${priceRange.min} - ${symbol}${priceRange.max}`;
      } else if (priceRange.min) {
        price = `From ${symbol}${priceRange.min}`;
      }
    }

    // Extract date and time
    let eventDate = tmEvent.dates?.start?.localDate || new Date().toISOString().split('T')[0];
    let eventTime = tmEvent.dates?.start?.localTime || '20:00';

    // Extract genre
    let eventGenre = 'Music';
    if (tmEvent.classifications && tmEvent.classifications[0]) {
      const classification = tmEvent.classifications[0];
      if (classification.genre && classification.genre.name) {
        eventGenre = classification.genre.name;
      } else if (classification.segment && classification.segment.name) {
        eventGenre = classification.segment.name;
      }
    }

    // Extract artists
    let artists = tmEvent.name;
    if (tmEvent._embedded && tmEvent._embedded.attractions) {
      const attractionNames = tmEvent._embedded.attractions
        .map(attraction => attraction.name)
        .join(', ');
      if (attractionNames) {
        artists = attractionNames;
      }
    }

    // Get event image
    let imageUrl = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=200&fit=crop';
    if (tmEvent.images && tmEvent.images.length > 0) {
      // Find a good sized image
      const goodImage = tmEvent.images.find(img => img.width >= 300) || tmEvent.images[0];
      imageUrl = goodImage.url;
    }

    return {
      id: `tm_${tmEvent.id}`,
      title: tmEvent.name,
      artist: artists,
      venue: venue,
      location: eventLocation,
      date: eventDate,
      time: eventTime,
      price: price,
      genre: eventGenre,
      source: 'Ticketmaster',
      ticketUrl: tmEvent.url,
      imageUrl: imageUrl,
      rawData: tmEvent // Keep original data for debugging
    };
  }

  getGenreClassification(genre) {
    const genreMap = {
      // Electronic/Dance
      'drum and bass': 'KnvZfZ7vAvv',
      'drum & bass': 'KnvZfZ7vAvv',
      'dnb': 'KnvZfZ7vAvv',
      'electronic': 'KnvZfZ7vAvv',
      'house': 'KnvZfZ7vAvv',
      'techno': 'KnvZfZ7vAvv',
      'trance': 'KnvZfZ7vAvv',
      'edm': 'KnvZfZ7vAvv',
      
      // Rock
      'rock': 'KnvZfZ7vAeA',
      'alternative': 'KnvZfZ7vAeA',
      'indie': 'KnvZfZ7vAeA',
      'punk': 'KnvZfZ7vAeA',
      
      // Hip Hop
      'hip hop': 'KnvZfZ7vAv1',
      'rap': 'KnvZfZ7vAv1',
      'hip-hop': 'KnvZfZ7vAv1',
      
      // Pop
      'pop': 'KnvZfZ7vAev',
      
      // Jazz
      'jazz': 'KnvZfZ7vAvE',
      
      // Country
      'country': 'KnvZfZ7vAv6'
    };

    return genreMap[genre.toLowerCase()] || null;
  }

  // Utility method to search by coordinates if we have them
  async searchEventsByCoordinates({ lat, lng, genre, date, radius = 25 }) {
    if (!this.apiKey) {
      return [];
    }

    try {
      const params = {
        apikey: this.apiKey,
        keyword: genre,
        latlong: `${lat},${lng}`,
        radius: radius,
        unit: 'miles',
        startDateTime: `${date}T00:00:00Z`,
        endDateTime: `${date}T23:59:59Z`,
        size: 50
      };

      const response = await axios.get(`${this.baseURL}/events.json`, { params });
      
      if (response.data?._embedded?.events) {
        return response.data._embedded.events.map(event => this.formatEvent(event));
      }
      
      return [];
    } catch (error) {
      console.error('Ticketmaster coordinates search error:', error.message);
      return [];
    }
  }
}

module.exports = new TicketmasterAPI();