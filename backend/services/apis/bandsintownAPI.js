// backend/services/apis/bandsintownAPI.js
const axios = require('axios');

class BandsintownAPI {
  constructor() {
    this.baseURL = 'https://rest.bandsintown.com';
    this.appId = process.env.BANDSINTOWN_APP_ID || 'music-event-finder';
  }

  async searchEvents({ location, genre, date }) {
    try {
      console.log(`🎪 Searching Bandsintown: ${genre} in ${location} on ${date}`);

      // Bandsintown requires artist-based searches, so we'll search for genre-related artists
      const genreArtists = this.getPopularArtistsByGenre(genre);
      
      if (genreArtists.length === 0) {
        console.log('ℹ️ No known artists for this genre on Bandsintown');
        return [];
      }

      // Search events for multiple artists in parallel
      const searchPromises = genreArtists.map(artist => 
        this.searchArtistEvents(artist, location, date)
      );

      const results = await Promise.allSettled(searchPromises);
      
      let allEvents = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allEvents = allEvents.concat(result.value);
        } else {
          console.log(`Artist search failed for ${genreArtists[index]}:`, result.reason.message);
        }
      });

      // Remove duplicates and limit results
      const uniqueEvents = this.removeDuplicates(allEvents);
      const limitedEvents = uniqueEvents.slice(0, 20); // Limit to 20 events

      console.log(`✅ Bandsintown found ${limitedEvents.length} events`);
      return limitedEvents;

    } catch (error) {
      console.error('❌ Bandsintown API error:', error.message);
      return [];
    }
  }

  async searchArtistEvents(artistName, location, date) {
    try {
      // Clean artist name for URL
      const cleanArtistName = encodeURIComponent(artistName);
      
      const params = {
        app_id: this.appId,
        date: `${date},${date}` // Bandsintown date range format
      };

      let url = `${this.baseURL}/artists/${cleanArtistName}/events`;

      const response = await axios.get(url, {
        params,
        timeout: 8000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data && Array.isArray(response.data)) {
        // Filter by location
        const locationFiltered = response.data.filter(event => 
          this.matchesLocation(event, location)
        );

        return locationFiltered.map(event => this.formatEvent(event, artistName));
      }

      return [];

    } catch (error) {
      if (error.response?.status === 404) {
        // Artist not found - this is normal
        return [];
      }
      console.error(`Bandsintown artist search error for ${artistName}:`, error.message);
      return [];
    }
  }

  matchesLocation(event, searchLocation) {
    if (!event.venue || !searchLocation) return true;

    const searchLower = searchLocation.toLowerCase();
    const venue = event.venue;

    // Check city
    if (venue.city && venue.city.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Check country
    if (venue.country && venue.country.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Check region/state
    if (venue.region && venue.region.toLowerCase().includes(searchLower)) {
      return true;
    }

    return false;
  }

  getPopularArtistsByGenre(genre) {
    const genreArtists = {
      'drum and bass': [
        'Netsky', 'LTJ Bukem', 'Goldie', 'Roni Size', 'Andy C', 
        'High Contrast', 'Calibre', 'Matrix & Futurebound', 'Sub Focus'
      ],
      'dnb': ['Netsky', 'Andy C', 'Sub Focus', 'High Contrast'],
      'd&b': ['Netsky', 'Andy C', 'Sub Focus', 'High Contrast'],
      'house': [
        'Calvin Harris', 'David Guetta', 'Disclosure', 'Duke Dumont',
        'Armand Van Helden', 'Mark Knight', 'Pete Tong', 'Kerri Chandler'
      ],
      'techno': [
        'Carl Cox', 'Adam Beyer', 'Charlotte de Witte', 'Amelie Lens',
        'Nina Kraviz', 'Richie Hawtin', 'Jeff Mills', 'Ben Klock'
      ],
      'electronic': [
        'Deadmau5', 'Skrillex', 'Calvin Harris', 'David Guetta',
        'The Chemical Brothers', 'Daft Punk', 'Justice', 'Disclosure'
      ],
      'edm': [
        'Calvin Harris', 'David Guetta', 'Skrillex', 'Deadmau5',
        'Martin Garrix', 'Tiesto', 'Armin van Buuren', 'Steve Aoki'
      ],
      'trance': [
        'Armin van Buuren', 'Paul van Dyk', 'Tiesto', 'Above & Beyond',
        'Aly & Fila', 'Ferry Corsten', 'Markus Schulz', 'Gareth Emery'
      ],
      'dubstep': [
        'Skrillex', 'Zomboy', 'Flux Pavilion', 'Modestep',
        'Nero', 'Rusko', 'Caspa', 'Borgore'
      ],
      'hip hop': [
        'Drake', 'Kendrick Lamar', 'J. Cole', 'Travis Scott',
        'Post Malone', 'Lil Wayne', 'Eminem', 'Kanye West'
      ],
      'rap': [
        'Drake', 'Kendrick Lamar', 'J. Cole', 'Travis Scott',
        'A$AP Rocky', 'Tyler, The Creator', 'Childish Gambino'
      ],
      'rock': [
        'Foo Fighters', 'Arctic Monkeys', 'The Strokes', 'Kings of Leon',
        'Royal Blood', 'Muse', 'Queens of the Stone Age', 'Pearl Jam'
      ],
      'indie': [
        'Arctic Monkeys', 'The Strokes', 'Vampire Weekend', 'Tame Impala',
        'Foster the People', 'Two Door Cinema Club', 'The 1975'
      ],
      'pop': [
        'Taylor Swift', 'Ed Sheeran', 'Dua Lipa', 'The Weeknd',
        'Billie Eilish', 'Harry Styles', 'Olivia Rodrigo'
      ],
      'jazz': [
        'Kamasi Washington', 'Robert Glasper', 'Esperanza Spalding',
        'Brad Mehldau', 'GoGo Penguin', 'Snarky Puppy'
      ],
      'metal': [
        'Metallica', 'Iron Maiden', 'Black Sabbath', 'Slayer',
        'Megadeth', 'Judas Priest', 'Tool', 'System of a Down'
      ]
    };

    return genreArtists[genre.toLowerCase()] || [];
  }

  removeDuplicates(events) {
    const seen = new Set();
    return events.filter(event => {
      const key = `${event.title}-${event.venue}-${event.date}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  formatEvent(bitEvent, searchArtist) {
    // Extract venue information
    let venue = 'Unknown Venue';
    let eventLocation = 'Unknown Location';
    
    if (bitEvent.venue) {
      venue = bitEvent.venue.name;
      eventLocation = `${bitEvent.venue.city}`;
      if (bitEvent.venue.country) {
        eventLocation += `, ${bitEvent.venue.country}`;
      }
    }

    // Extract date and time
    let eventDate = bitEvent.datetime ? bitEvent.datetime.split('T')[0] : new Date().toISOString().split('T')[0];
    let eventTime = bitEvent.datetime ? bitEvent.datetime.split('T')[1]?.substring(0, 5) || '20:00' : '20:00';

    // Artist lineup
    let artists = searchArtist;
    if (bitEvent.lineup && bitEvent.lineup.length > 0) {
      artists = bitEvent.lineup.join(', ');
    }

    // Bandsintown doesn't provide pricing in API
    let price = 'See Bandsintown';

    // Try to get image
    let imageUrl = 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=200&fit=crop';
    if (bitEvent.artist_image_url) {
      imageUrl = bitEvent.artist_image_url;
    }

    return {
      id: `bit_${bitEvent.id || Math.random().toString(36)}`,
      title: bitEvent.title || `${searchArtist} Concert`,
      artist: artists,
      venue: venue,
      location: eventLocation,
      date: eventDate,
      time: eventTime,
      price: price,
      genre: this.determineGenre(searchArtist),
      source: 'Bandsintown',
      ticketUrl: bitEvent.url || bitEvent.facebook_rsvp_url || '#',
      imageUrl: imageUrl,
      rawData: bitEvent
    };
  }

  determineGenre(artistName) {
    // Simple genre determination based on artist
    const genreMap = {
      'netsky': 'Drum & Bass',
      'calvin harris': 'House',
      'skrillex': 'Dubstep',
      'carl cox': 'Techno',
      'armin van buuren': 'Trance',
      'drake': 'Hip Hop',
      'arctic monkeys': 'Indie Rock',
      'foo fighters': 'Rock'
    };

    const artistLower = artistName.toLowerCase();
    for (const [artist, genre] of Object.entries(genreMap)) {
      if (artistLower.includes(artist)) {
        return genre;
      }
    }

    return 'Music';
  }

  // Method to get trending events in a location
  async getTrendingEvents(location) {
    try {
      const popularArtists = [
        'Calvin Harris', 'David Guetta', 'Drake', 'Arctic Monkeys',
        'Foo Fighters', 'The Weeknd', 'Dua Lipa', 'Skrillex'
      ];

      const promises = popularArtists.map(artist => 
        this.searchArtistEvents(artist, location, new Date().toISOString().split('T')[0])
      );

      const results = await Promise.allSettled(promises);
      let allEvents = [];
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          allEvents = allEvents.concat(result.value);
        }
      });

      return this.removeDuplicates(allEvents).slice(0, 10);
    } catch (error) {
      console.error('Bandsintown trending events error:', error.message);
      return [];
    }
  }
}

module.exports = new BandsintownAPI();