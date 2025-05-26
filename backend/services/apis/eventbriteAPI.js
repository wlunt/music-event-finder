// backend/services/apis/eventbriteAPI.js
const axios = require('axios');

class EventbriteAPI {
  constructor() {
    this.baseURL = 'https://www.eventbriteapi.com/v3';
    this.apiKey = process.env.EVENTBRITE_API_KEY;
  }

  async searchEvents({ location, genre, date }) {
    if (!this.apiKey) {
      console.log('⚠️ Eventbrite API key not found');
      return [];
    }

    try {
      console.log(`🎟️ Searching Eventbrite: ${genre} in ${location} on ${date}`);

      // Format date for Eventbrite (they want start and end datetime)
      const startDate = `${date}T00:00:00`;
      const endDate = `${date}T23:59:59`;

      // Build search query with enhanced genre keywords
      const enhancedQuery = this.buildSearchQuery(genre);

      const params = {
        q: enhancedQuery,
        'location.address': location,
        'start_date.range_start': startDate,
        'start_date.range_end': endDate,
        'categories': this.getMusicCategoryId(),
        'sort_by': 'relevance',
        'expand': 'venue,organizer,format,category,subcategory,bookmark_info,refund_policy,ticket_availability,logo',
        'page_size': 50
      };

      const response = await axios.get(`${this.baseURL}/events/search/`, {
        params,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data && response.data.events) {
        // Filter events by genre relevance
        const filteredEvents = this.filterEventsByGenre(response.data.events, genre);
        const formattedEvents = filteredEvents.map(event => this.formatEvent(event));
        
        console.log(`✅ Eventbrite found ${formattedEvents.length} events`);
        return formattedEvents;
      }

      console.log('ℹ️ No events found on Eventbrite');
      return [];

    } catch (error) {
      console.error('❌ Eventbrite API error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return [];
    }
  }

  buildSearchQuery(genre) {
    // Create enhanced search queries for better matching
    const genreQueries = {
      'drum and bass': 'drum and bass OR dnb OR "d&b" OR jungle OR liquid',
      'dnb': 'drum and bass OR dnb OR "d&b" OR jungle',
      'd&b': 'drum and bass OR dnb OR "d&b" OR jungle',
      'house': 'house music OR "deep house" OR "tech house" OR "progressive house"',
      'techno': 'techno OR "electronic music" OR "tech house"',
      'electronic': 'electronic music OR EDM OR "dance music" OR electro',
      'edm': 'EDM OR "electronic dance music" OR festival OR rave',
      'trance': 'trance OR "progressive trance" OR "uplifting trance"',
      'dubstep': 'dubstep OR bass music OR "electronic music"',
      'hip hop': 'hip hop OR rap OR "hip-hop" OR hiphop',
      'rap': 'rap OR hip hop OR "hip-hop"',
      'rock': 'rock music OR "alternative rock" OR "indie rock"',
      'indie': 'indie music OR independent OR alternative',
      'pop': 'pop music OR mainstream OR "popular music"',
      'jazz': 'jazz music OR "smooth jazz" OR "jazz fusion"',
      'blues': 'blues music OR "rhythm and blues"',
      'country': 'country music OR americana OR folk',
      'metal': 'metal music OR "heavy metal" OR "death metal"',
      'punk': 'punk music OR "punk rock" OR hardcore',
      'reggae': 'reggae music OR ska OR dub',
      'classical': 'classical music OR orchestra OR symphony',
      'folk': 'folk music OR acoustic OR singer-songwriter',
      'ambient': 'ambient music OR "electronic music" OR experimental',
      'minimal': 'minimal techno OR minimal music OR electronic'
    };

    return genreQueries[genre.toLowerCase()] || `${genre} music`;
  }

  getMusicCategoryId() {
    // Eventbrite's music category ID
    return '103'; // Music category
  }

  filterEventsByGenre(events, searchGenre) {
    if (!searchGenre) return events;

    const genreKeywords = this.getGenreKeywords(searchGenre.toLowerCase());
    
    return events.filter(event => {
      const searchText = `${event.name?.text || ''} ${event.description?.text || ''} ${event.summary || ''}`.toLowerCase();
      
      // Check if any genre keywords appear in the event text
      return genreKeywords.some(keyword => searchText.includes(keyword));
    });
  }

  getGenreKeywords(genre) {
    const keywordMap = {
      'drum and bass': ['drum', 'bass', 'dnb', 'd&b', 'jungle', 'liquid', 'neurofunk'],
      'dnb': ['drum', 'bass', 'dnb', 'd&b', 'jungle'],
      'd&b': ['drum', 'bass', 'dnb', 'd&b', 'jungle'],
      'house': ['house', 'deep house', 'tech house', 'progressive house', 'electro house'],
      'techno': ['techno', 'minimal', 'tech house', 'detroit', 'industrial'],
      'electronic': ['electronic', 'edm', 'dance', 'electro', 'synth', 'digital'],
      'edm': ['edm', 'electronic', 'dance', 'festival', 'rave', 'club'],
      'trance': ['trance', 'progressive', 'uplifting', 'psytrance', 'vocal trance'],
      'dubstep': ['dubstep', 'bass', 'wobble', 'brostep', 'riddim'],
      'hip hop': ['hip hop', 'rap', 'hiphop', 'hip-hop', 'mc', 'freestyle'],
      'rap': ['rap', 'hip hop', 'hiphop', 'freestyle', 'battle'],
      'rock': ['rock', 'alternative', 'indie rock', 'hard rock', 'classic rock'],
      'indie': ['indie', 'independent', 'alternative', 'underground'],
      'pop': ['pop', 'mainstream', 'chart', 'radio'],
      'jazz': ['jazz', 'smooth', 'fusion', 'bebop', 'swing'],
      'blues': ['blues', 'rhythm', 'delta', 'chicago'],
      'country': ['country', 'americana', 'folk', 'bluegrass', 'western'],
      'metal': ['metal', 'heavy', 'death', 'black', 'thrash', 'doom'],
      'punk': ['punk', 'hardcore', 'ska', 'emo', 'post-punk'],
      'reggae': ['reggae', 'ska', 'dub', 'dancehall', 'roots'],
      'classical': ['classical', 'orchestra', 'symphony', 'chamber', 'opera'],
      'folk': ['folk', 'acoustic', 'singer-songwriter', 'traditional'],
      'ambient': ['ambient', 'experimental', 'drone', 'soundscape'],
      'minimal': ['minimal', 'minimalist', 'repetitive']
    };

    return keywordMap[genre] || [genre];
  }

  formatEvent(ebEvent) {
    // Extract venue information
    let venue = 'Online Event';
    let eventLocation = 'Online';
    
    if (ebEvent.venue) {
      venue = ebEvent.venue.name || 'Unknown Venue';
      if (ebEvent.venue.address) {
        const addr = ebEvent.venue.address;
        eventLocation = `${addr.city || ''}, ${addr.country || ''}`.replace(', ,', ',').trim();
        if (eventLocation === ',') eventLocation = 'Unknown Location';
      }
    }

    // Extract date and time
    let eventDate = ebEvent.start?.local?.split('T')[0] || new Date().toISOString().split('T')[0];
    let eventTime = ebEvent.start?.local?.split('T')[1]?.substring(0, 5) || '20:00';

    // Extract pricing
    let price = 'Free';
    if (ebEvent.ticket_availability?.minimum_ticket_price) {
      const minPrice = ebEvent.ticket_availability.minimum_ticket_price;
      const currency = minPrice.currency || 'USD';
      const symbol = this.getCurrencySymbol(currency);
      price = `From ${symbol}${(minPrice.value / 100).toFixed(2)}`;
    } else if (ebEvent.is_free === false) {
      price = 'Paid Event';
    }

    // Try to determine genre from categories
    let eventGenre = 'Music';
    if (ebEvent.category?.name) {
      eventGenre = ebEvent.category.name;
    } else if (ebEvent.subcategory?.name) {
      eventGenre = ebEvent.subcategory.name;
    }

    // Get event image
    let imageUrl = 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=200&fit=crop';
    if (ebEvent.logo?.original?.url) {
      imageUrl = ebEvent.logo.original.url;
    }

    // Extract organizer as artist
    let artist = 'Various Artists';
    if (ebEvent.organizer?.name) {
      artist = ebEvent.organizer.name;
    }

    return {
      id: `eb_${ebEvent.id}`,
      title: ebEvent.name?.text || 'Untitled Event',
      artist: artist,
      venue: venue,
      location: eventLocation,
      date: eventDate,
      time: eventTime,
      price: price,
      genre: eventGenre,
      source: 'Eventbrite',
      ticketUrl: ebEvent.url,
      imageUrl: imageUrl,
      description: ebEvent.summary || ebEvent.description?.text?.substring(0, 200) + '...',
      rawData: ebEvent
    };
  }

  getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥'
    };
    return symbols[currency] || currency;
  }

  // Method to search events by organization
  async searchByOrganizer(organizerName, location, date) {
    if (!this.apiKey) return [];

    try {
      const params = {
        q: organizerName,
        'location.address': location,
        'start_date.range_start': `${date}T00:00:00`,
        'start_date.range_end': `${date}T23:59:59`,
        'expand': 'venue,organizer',
        'page_size': 20
      };

      const response = await axios.get(`${this.baseURL}/events/search/`, {
        params,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.data?.events) {
        return response.data.events.map(event => this.formatEvent(event));
      }

      return [];
    } catch (error) {
      console.error('Eventbrite organizer search error:', error.message);
      return [];
    }
  }

  // Method to get popular music events
  async getPopularMusicEvents(location) {
    if (!this.apiKey) return [];

    try {
      const params = {
        'categories': this.getMusicCategoryId(),
        'location.address': location,
        'sort_by': 'best',
        'expand': 'venue,organizer,logo',
        'page_size': 20
      };

      const response = await axios.get(`${this.baseURL}/events/search/`, {
        params,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.data?.events) {
        return response.data.events.map(event => this.formatEvent(event));
      }

      return [];
    } catch (error) {
      console.error('Eventbrite popular events error:', error.message);
      return [];
    }
  }
}

module.exports = new EventbriteAPI();