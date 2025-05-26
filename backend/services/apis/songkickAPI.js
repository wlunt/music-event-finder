// backend/services/apis/songkickAPI.js
class SongkickAPI {
  async searchEvents({ location, genre, date }) {
    console.log('🎵 Songkick API called (placeholder)');
    // For now, return empty array - we'll implement this later
    return [];
  }
}

module.exports = new SongkickAPI();