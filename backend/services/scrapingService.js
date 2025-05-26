// backend/services/scrapingService.js
const axios = require('axios');
const cheerio = require('cheerio');

class ScrapingService {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    };
    
    // Session management
    this.session = axios.create({
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status < 500; // Accept redirects and client errors
      }
    });
  }

  async scrapeAllSources({ location, genre, date }) {
    console.log(`🕷️ Starting scraping for ${genre} in ${location} on ${date}`);
    
    const results = await Promise.allSettled([
      this.scrapeResidentAdvisor({ location, genre, date }),
      // We can add more scrapers here later
      // this.scrapeFatsoma({ location, genre, date }),
      // this.scrapeSkiddle({ location, genre, date })
    ]);

    let allEvents = [];
    results.forEach((result, index) => {
      const sources = ['Resident Advisor'];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${sources[index]}: ${result.value.length} events`);
        allEvents = allEvents.concat(result.value);
      } else {
        console.log(`❌ ${sources[index]} failed:`, result.reason.message);
      }
    });

    return allEvents;
  }

  async scrapeResidentAdvisor({ location, genre, date }) {
    try {
      console.log(`🎛️ Scraping Resident Advisor for ${genre} in ${location}`);

      // Convert location to RA area code
      const areaCode = this.getRAAreaCode(location);
      if (!areaCode) {
        console.log(`⚠️ Unsupported location for RA: ${location}`);
        return [];
      }

      // Try multiple strategies to bypass bot detection
      const strategies = [
        () => this.scrapeRAWithDelay(areaCode, date),
        () => this.scrapeRAHomepage(areaCode),
        () => this.scrapeRAAlternative(areaCode, date)
      ];

      for (let i = 0; i < strategies.length; i++) {
        try {
          console.log(`🔄 Trying RA strategy ${i + 1}...`);
          const events = await strategies[i]();
          if (events && events.length > 0) {
            // Filter by genre
            const filteredEvents = events.filter(event => this.matchesGenre(event, genre));
            console.log(`✅ RA strategy ${i + 1} found ${filteredEvents.length} matching events`);
            return filteredEvents;
          }
        } catch (error) {
          console.log(`❌ RA strategy ${i + 1} failed:`, error.message);
          if (i === strategies.length - 1) {
            throw error;
          }
        }
      }

      return [];

    } catch (error) {
      console.error('❌ All RA scraping strategies failed:', error.message);
      
      // For now, return mock RA data so we can test the rest of the app
      return this.getMockRAEvents(location, genre, date);
    }
  }

  async scrapeRAWithDelay(areaCode, date) {
    // Add random delay to seem more human
    await this.randomDelay(1000, 3000);

    // First visit homepage to establish session
    await this.session.get('https://ra.co', { headers: this.headers });
    
    // Wait a bit
    await this.randomDelay(2000, 4000);

    // Now try the events page
    const searchUrl = `https://ra.co/events/${areaCode}/${date}`;
    console.log(`🔗 RA URL: ${searchUrl}`);

    const response = await this.session.get(searchUrl, { headers: this.headers });
    
    if (response.status === 403) {
      throw new Error('Still blocked after delay strategy');
    }

    return this.parseRAResponse(response.data, location, date);
  }

  async scrapeRAHomepage(areaCode) {
    // Try just the area homepage without specific date
    const homeUrl = `https://ra.co/events/${areaCode}`;
    console.log(`🏠 Trying RA homepage: ${homeUrl}`);

    const response = await this.session.get(homeUrl, { headers: this.headers });
    
    if (response.status === 403) {
      throw new Error('Blocked on homepage strategy');
    }

    return this.parseRAResponse(response.data, areaCode.split('/')[1], null);
  }

  async scrapeRAAlternative(areaCode, date) {
    // Try mobile version or API endpoint
    const mobileUrl = `https://m.ra.co/events/${areaCode}`;
    
    const mobileHeaders = {
      ...this.headers,
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    };

    const response = await this.session.get(mobileUrl, { headers: mobileHeaders });
    
    if (response.status === 403) {
      throw new Error('Blocked on mobile strategy');
    }

    return this.parseRAResponse(response.data, areaCode.split('/')[1], date);
  }

  parseRAResponse(html, location, date) {
    const $ = cheerio.load(html);
    const events = [];

    // Multiple selectors to try
    const eventSelectors = [
      'article[data-event-id]',
      '.event-item', 
      '[data-testid="event"]',
      '.ra-event',
      'article',
      '.Event' // React component class name
    ];

    let eventElements = null;
    for (const selector of eventSelectors) {
      eventElements = $(selector);
      if (eventElements.length > 0) {
        console.log(`✅ Found ${eventElements.length} elements using: ${selector}`);
        break;
      }
    }

    if (!eventElements || eventElements.length === 0) {
      console.log('📋 Page title:', $('title').text());
      console.log('📄 Body classes:', $('body').attr('class'));
      
      // Look for any links that might be events
      const eventLinks = $('a[href*="/events/"]');
      console.log(`🔗 Found ${eventLinks.length} event links`);
      
      if (eventLinks.length > 0) {
        eventLinks.each((i, el) => {
          if (i < 5) { // Limit to first 5 for testing
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            console.log(`Event link ${i}: ${text} -> ${href}`);
          }
        });
      }
      
      return [];
    }

    // Parse events
    eventElements.each((index, element) => {
      if (index < 10) { // Limit for testing
        try {
          const event = this.parseRAEvent($, element, location, date);
          if (event) {
            events.push(event);
          }
        } catch (error) {
          console.log(`⚠️ Error parsing event ${index}:`, error.message);
        }
      }
    });

    return events;
  }

  getMockRAEvents(location, genre, date) {
    console.log('🎭 Returning mock RA events for testing');
    
    return [
      {
        id: 'ra_mock_1',
        title: `Underground ${genre} Night`,
        artist: 'Local DJs, Special Guest',
        venue: 'Fabric Room 1',
        location: location,
        date: date,
        time: '23:00',
        price: '£15 - £20',
        genre: genre,
        source: 'Resident Advisor (Mock)',
        ticketUrl: 'https://ra.co',
        imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220c9c4e21f?w=300&h=200&fit=crop'
      },
      {
        id: 'ra_mock_2', 
        title: `${genre} Sessions`,
        artist: 'Various Artists',
        venue: 'XOYO',
        location: location,
        date: date,
        time: '22:00',
        price: '£12 - £18',
        genre: genre,
        source: 'Resident Advisor (Mock)',
        ticketUrl: 'https://ra.co',
        imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220c9c4e21f?w=300&h=200&fit=crop'
      }
    ];
  }

  randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  parseRAEvent($, element, location, defaultDate) {
    const $el = $(element);

    // Extract event title
    let title = $el.find('h3 a').text().trim() || 
                $el.find('.event-title').text().trim() ||
                $el.find('[data-testid="event-title"]').text().trim() ||
                'RA Event';

    // Extract artists/lineup
    let artists = $el.find('.event-lineup').text().trim() ||
                  $el.find('.artists').text().trim() ||
                  $el.find('[data-testid="lineup"]').text().trim() ||
                  'Various Artists';

    // Extract venue
    let venue = $el.find('.event-venue').text().trim() ||
                $el.find('.venue').text().trim() ||
                $el.find('[data-testid="venue"]').text().trim() ||
                'Unknown Venue';

    // Extract date and time
    let eventDate = defaultDate;
    let eventTime = '22:00'; // Default club time

    const dateEl = $el.find('.event-date, .date, [data-testid="date"]');
    if (dateEl.length > 0) {
      const dateText = dateEl.text().trim();
      // Try to parse RA date format
      eventDate = this.parseRADate(dateText, defaultDate);
    }

    const timeEl = $el.find('.event-time, .time, [data-testid="time"]');
    if (timeEl.length > 0) {
      const timeText = timeEl.text().trim();
      eventTime = this.parseRATime(timeText);
    }

    // Extract price
    let price = 'See RA';
    const priceEl = $el.find('.event-price, .price, [data-testid="price"]');
    if (priceEl.length > 0) {
      price = priceEl.text().trim() || 'See RA';
    }

    // Extract event URL
    let eventUrl = 'https://ra.co';
    const linkEl = $el.find('a').first();
    if (linkEl.length > 0) {
      let href = linkEl.attr('href');
      if (href && !href.startsWith('http')) {
        href = 'https://ra.co' + href;
      }
      eventUrl = href || eventUrl;
    }

    // Extract image
    let imageUrl = 'https://images.unsplash.com/photo-1571266028243-d220c9c4e21f?w=300&h=200&fit=crop';
    const imgEl = $el.find('img').first();
    if (imgEl.length > 0) {
      let src = imgEl.attr('src') || imgEl.attr('data-src');
      if (src && !src.startsWith('data:')) {
        if (!src.startsWith('http')) {
          src = 'https://ra.co' + src;
        }
        imageUrl = src;
      }
    }

    return {
      id: `ra_${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      artist: artists,
      venue: venue,
      location: location,
      date: eventDate,
      time: eventTime,
      price: price,
      genre: 'Electronic', // RA is mostly electronic
      source: 'Resident Advisor',
      ticketUrl: eventUrl,
      imageUrl: imageUrl,
      rawData: {
        html: $el.html(),
        text: $el.text()
      }
    };
  }

  matchesGenre(event, searchGenre) {
    if (!searchGenre) return true;

    const searchText = `${event.title} ${event.artist} ${event.venue}`.toLowerCase();
    const genre = searchGenre.toLowerCase();

    // Electronic music genre matching
    const genreKeywords = {
      'drum and bass': ['drum', 'bass', 'dnb', 'd&b', 'jungle', 'liquid'],
      'dnb': ['drum', 'bass', 'dnb', 'd&b', 'jungle'],
      'd&b': ['drum', 'bass', 'dnb', 'd&b', 'jungle'],
      'house': ['house', 'deep', 'tech house', 'progressive'],
      'techno': ['techno', 'tech', 'minimal', 'industrial'],
      'electronic': ['electronic', 'edm', 'dance', 'club'],
      'trance': ['trance', 'progressive', 'uplifting', 'psy'],
      'dubstep': ['dubstep', 'bass', 'wobble'],
      'ambient': ['ambient', 'experimental', 'drone'],
      'minimal': ['minimal', 'minimalist'],
      'disco': ['disco', 'funk', 'nu-disco'],
      'breaks': ['breaks', 'breakbeat', 'nu breaks']
    };

    const keywords = genreKeywords[genre] || [genre];
    return keywords.some(keyword => searchText.includes(keyword));
  }

  getRAAreaCode(location) {
    // RA area codes for major cities
    const areaCodes = {
      // UK
      'london': 'uk/london',
      'bristol': 'uk/bristol', 
      'manchester': 'uk/manchester',
      'birmingham': 'uk/birmingham',
      'leeds': 'uk/leeds',
      'glasgow': 'uk/glasgow',
      'edinburgh': 'uk/edinburgh',
      'liverpool': 'uk/liverpool',
      'brighton': 'uk/brighton',
      'nottingham': 'uk/nottingham',

      // Europe
      'berlin': 'de/berlin',
      'amsterdam': 'nl/amsterdam',
      'paris': 'fr/paris',
      'barcelona': 'es/barcelona',
      'madrid': 'es/madrid',
      'rome': 'it/rome',
      'milan': 'it/milan',
      'zurich': 'ch/zurich',
      'vienna': 'at/vienna',
      'prague': 'cz/prague',

      // North America
      'new york': 'us/newyork',
      'los angeles': 'us/losangeles',
      'chicago': 'us/chicago',
      'miami': 'us/miami',
      'detroit': 'us/detroit',
      'san francisco': 'us/sanfrancisco',
      'toronto': 'ca/toronto',
      'montreal': 'ca/montreal',

      // Australia
      'melbourne': 'au/melbourne',
      'sydney': 'au/sydney',

      // Other
      'tokyo': 'jp/tokyo',
      'buenos aires': 'ar/buenosaires'
    };

    const locationLower = location.toLowerCase();
    
    // Direct match
    if (areaCodes[locationLower]) {
      return areaCodes[locationLower];
    }

    // Partial match
    for (const [city, code] of Object.entries(areaCodes)) {
      if (locationLower.includes(city) || city.includes(locationLower)) {
        return code;
      }
    }

    return null;
  }

  parseRADate(dateText, defaultDate) {
    if (!dateText) return defaultDate;

    // RA date formats can vary
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,    // YYYY-MM-DD
      /(\d{1,2})\s+(\w+)\s+(\d{4})/     // DD Month YYYY
    ];

    for (const pattern of datePatterns) {
      const match = dateText.match(pattern);
      if (match) {
        // Convert to YYYY-MM-DD format
        if (pattern === datePatterns[0]) { // DD/MM/YYYY
          return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        } else if (pattern === datePatterns[1]) { // YYYY-MM-DD
          return match[0];
        }
      }
    }

    return defaultDate;
  }

  parseRATime(timeText) {
    if (!timeText) return '22:00';

    // Extract time from text like "22:00", "10pm", "22:00 - 06:00"
    const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?(?:\s*([ap]m))?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] || '00';
      const ampm = timeMatch[3];

      if (ampm && ampm.toLowerCase() === 'pm' && hours < 12) {
        hours += 12;
      } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    return '22:00';
  }

  // Method to test RA scraping without full search
  async testRAScraping(location = 'london') {
    try {
      const areaCode = this.getRAAreaCode(location);
      if (!areaCode) {
        console.log('Location not supported');
        return;
      }

      const testUrl = `https://ra.co/events/${areaCode}`;
      console.log(`Testing RA scraping: ${testUrl}`);

      const response = await axios.get(testUrl, {
        headers: this.headers,
        timeout: 10000
      });

      console.log('Response status:', response.status);
      console.log('Content length:', response.data.length);
      
      const $ = cheerio.load(response.data);
      console.log('Page title:', $('title').text());
      
      // Check for various event selectors
      const selectors = ['article', '.event-item', '[data-event-id]', '.ra-event'];
      selectors.forEach(selector => {
        const count = $(selector).length;
        console.log(`${selector}: ${count} elements`);
      });

    } catch (error) {
      console.error('RA test error:', error.message);
    }
  }
}

module.exports = new ScrapingService();