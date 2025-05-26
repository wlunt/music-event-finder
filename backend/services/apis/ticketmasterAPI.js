// backend/services/apis/ticketmasterAPI.js
class TicketmasterAPI {
  async searchEvents({ location, genre, date }) {
    console.log('🎟️ Ticketmaster API called (placeholder)');
    // For now, return empty array - we'll implement this later
    return [];
  }
}

module.exports = new TicketmasterAPI();