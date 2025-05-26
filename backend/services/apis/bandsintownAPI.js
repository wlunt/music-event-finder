// backend/services/apis/bandsintownAPI.js
class BandsintownAPI {
  async searchEvents({ location, genre, date }) {
    console.log('🎪 Bandsintown API called (placeholder)');
    // For now, return empty array - we'll implement this later
    return [];
  }
}

module.exports = new BandsintownAPI();