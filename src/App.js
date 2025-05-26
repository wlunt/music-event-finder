import React, { useState } from 'react';
import { Search, MapPin, Calendar, Music, ExternalLink, Clock } from 'lucide-react';


const EventFinder = () => {
  const [searchParams, setSearchParams] = useState({
    location: '',
    genre: '',
    date: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState([]);

  // Mock event data for testing UI
  const mockEvents = [
    {
      id: 1,
      title: "Hospital Records Presents: Drum & Bass Night",
      artist: "LTJ Bukem, Netsky, Matrix & Futurebound",
      venue: "Motion Bristol",
      location: "Bristol, UK",
      date: "2025-05-25",
      time: "22:00",
      price: "£25 - £45",
      genre: "Drum & Bass",
      source: "Resident Advisor",
      ticketUrl: "https://ra.co/events/123456",
      imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=200&fit=crop"
    },
    {
      id: 2,
      title: "Sunday Sessions: Liquid DNB",
      artist: "Calibre, Marcus Intalex, St. Files",
      venue: "Thekla",
      location: "Bristol, UK", 
      date: "2025-05-25",
      time: "16:00",
      price: "£15 - £20",
      genre: "Drum & Bass",
      source: "Songkick",
      ticketUrl: "https://songkick.com/events/123456",
      imageUrl: "https://images.unsplash.com/photo-1571266028243-d220c2c35a40?w=300&h=200&fit=crop"
    },
    {
      id: 3,
      title: "Hospitality in the Park",
      artist: "High Contrast, Danny Byrd, Camo & Krooked",
      venue: "Finsbury Park",
      location: "London, UK",
      date: "2025-05-25", 
      time: "14:00",
      price: "£35 - £65",
      genre: "Drum & Bass",
      source: "Fatsoma",
      ticketUrl: "https://fatsoma.com/events/123456",
      imageUrl: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=200&fit=crop"
    }
  ];

 const handleSearch = async () => {
  setIsLoading(true);
  
  try {
    console.log('Calling backend API...');
    
    const response = await fetch('http://localhost:5000/api/events/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: searchParams.location,
        genre: searchParams.genre,
        date: searchParams.date
      })
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Backend response:', data);
    
    if (data.success) {
      setEvents(data.events);
    } else {
      console.error('Search failed:', data.error);
      setEvents([]);
    }
  } catch (error) {
    console.error('Error calling backend:', error);
    setEvents(mockEvents); // Fallback to mock data
  }
  
  setIsLoading(false);
};

  const handleInputChange = (field, value) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Music className="h-12 w-12 text-purple-400 mr-3" />
            <h1 className="text-4xl font-bold text-white">EventFinder</h1>
          </div>
          <p className="text-xl text-gray-300">Discover live music events near you</p>
        </div>

        {/* Search Form */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Location Input */}
              <div className="relative">
                <label className="block text-white font-medium mb-2">
                  <MapPin className="inline h-4 w-4 mr-2" />
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bristol, UK"
                  value={searchParams.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
                />
              </div>

              {/* Genre Input */}
              <div className="relative">
                <label className="block text-white font-medium mb-2">
                  <Music className="inline h-4 w-4 mr-2" />
                  Genre
                </label>
                <input
                  type="text"
                  placeholder="e.g. Drum & Bass"
                  value={searchParams.genre}
                  onChange={(e) => handleInputChange('genre', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
                />
              </div>

              {/* Date Input */}
              <div className="relative">
                <label className="block text-white font-medium mb-2">
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Date
                </label>
                <input
                  type="date"
                  value={searchParams.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
                />
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Searching events...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-3" />
                  Find Events
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {events.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8">Found {events.length} events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div key={event.id} className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  {/* Event Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={event.imageUrl} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {event.genre}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{event.title}</h3>
                    <p className="text-gray-300 mb-3 line-clamp-1">{event.artist}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-300">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{event.venue}, {event.location}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-white">{event.price}</p>
                        <p className="text-xs text-gray-400">via {event.source}</p>
                      </div>
                      <a
                        href={event.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 flex items-center"
                      >
                        Get Tickets
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {events.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Enter your search criteria to find live music events</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventFinder;