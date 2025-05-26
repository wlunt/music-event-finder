// backend/services/eventService.js
const songkickAPI = require('./apis/songkickAPI');
const bandsintownAPI = require('./apis/bandsintownAPI');
const ticketmasterAPI = require('./apis/ticketmasterAPI');
const scrapingService = require('./scrapingService');

class EventService {
  
  async searchEvents({ location, genre, date }) {
    console.log(`🎵 Starting event search for ${genre} in ${location} on ${date}`);
    
    // Run all API calls in parallel for speed
    const promises = [
      this.getSongkickEvents({ location, genre, date }),
      this.getBandsintownEvents({ location, genre, date }),
      this.getTicketmasterEvents({ location, genre, date }),
      this.getScrapedEvents({ location, genre, date })
    ];
    
    try {
      const results = await Promise.allSettled(promises);
      
      // Combine all successful results
      let allEvents = [];
      results.forEach((result, index) => {
        const sources = ['Songkick', 'Bandsintown', 'Ticketmaster', 'Scraped'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${sources[index]}: ${result.value.length} events`);
          allEvents = allEvents.concat(result.value);
        } else {
          console.log(`❌ ${sources[index]} failed:`, result.reason.message);
        }
      });
      
      // Remove duplicates and sort by relevance
      const uniqueEvents = this.deduplicateEvents(allEvents);
      const sortedEvents = this.sortEventsByRelevance(uniqueEvents, { genre, date });
      
      console.log(`🎯 Found ${sortedEvents.length} unique events total`);
      return sortedEvents;
      
    } catch (error) {
      console.error('Error in searchEvents:', error);
      throw error;
    }
  }
  
  async getSongkickEvents({ location, genre, date }) {
    try {
      return await songkickAPI.searchEvents({ location, genre, date });
    } catch (error) {
      console.log('Songkick API failed:', error.message);
      return [];
    }
  }
  
  async getBandsintownEvents({ location, genre, date }) {
    try {
      return await bandsintownAPI.searchEvents({ location, genre, date });
    } catch (error) {
      console.log('Bandsintown API failed:', error.message);
      return [];
    }
  }
  
  async getTicketmasterEvents({ location, genre, date }) {
    try {
      return await ticketmasterAPI.searchEvents({ location, genre, date });
    } catch (error) {
      console.log('Ticketmaster API failed:', error.message);
      return [];
    }
  }
  
  async getScrapedEvents({ location, genre, date }) {
    try {
      // This will handle Resident Advisor, Fatsoma, etc.
      return await scrapingService.scrapeAllSources({ location, genre, date });
    } catch (error) {
      console.log('Scraping failed:', error.message);
      return [];
    }
  }
  
  deduplicateEvents(events) {
    // Remove duplicate events (same title, venue, date)
    const seen = new Set();
    return events.filter(event => {
      const key = `${event.title}-${event.venue}-${event.date}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  sortEventsByRelevance(events, { genre, date }) {
    return events.sort((a, b) => {
      // Prioritize events that match genre better
      const aGenreMatch = this.genreMatchScore(a.genre, genre);
      const bGenreMatch = this.genreMatchScore(b.genre, genre);
      
      if (aGenreMatch !== bGenreMatch) {
        return bGenreMatch - aGenreMatch;
      }
      
      // Then by date proximity
      const targetDate = new Date(date);
      const aDateDiff = Math.abs(new Date(a.date) - targetDate);
      const bDateDiff = Math.abs(new Date(b.date) - targetDate);
      
      return aDateDiff - bDateDiff;
    });
  }
  
  genreMatchScore(eventGenre, searchGenre) {
    if (!eventGenre || !searchGenre) return 0;
    
    const eventGenreLower = eventGenre.toLowerCase();
    const searchGenreLower = searchGenre.toLowerCase();
    
    // Exact match
    if (eventGenreLower === searchGenreLower) return 100;
    
    // Partial match
    if (eventGenreLower.includes(searchGenreLower) || searchGenreLower.includes(eventGenreLower)) {
      return 75;
    }
    
    // Genre synonyms (extend this as needed)
    const synonyms = {
      'drum and bass': ['dnb', 'd&b', 'drum & bass', 'jungle'],
      'electronic': ['edm', 'dance', 'house', 'techno', 'trance'],
      'hip hop': ['rap', 'hip-hop', 'hiphop'],
      'rock': ['alternative', 'indie rock', 'punk']
    };
    
    for (const [key, values] of Object.entries(synonyms)) {
      if ((key === searchGenreLower && values.includes(eventGenreLower)) ||
          (key === eventGenreLower && values.includes(searchGenreLower))) {
        return 50;
      }
    }
    
    return 0;
  }
  
  async getEventsByPlatform(platform, { location, genre, date }) {
    switch (platform.toLowerCase()) {
      case 'songkick':
        return await this.getSongkickEvents({ location, genre, date });
      case 'bandsintown':
        return await this.getBandsintownEvents({ location, genre, date });
      case 'ticketmaster':
        return await this.getTicketmasterEvents({ location, genre, date });
      case 'scraped':
        return await this.getScrapedEvents({ location, genre, date });
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }
}

module.exports = new EventService();