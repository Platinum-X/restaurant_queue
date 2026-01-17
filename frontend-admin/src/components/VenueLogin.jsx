import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function VenueLogin() {
    const [venues, setVenues] = useState([]);
    const [newVenueName, setNewVenueName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadVenues();
    }, []);

    const loadVenues = async () => {
        try {
            const response = await api.get('/venues/');
            setVenues(response.data);
        } catch (error) {
            console.error('Error loading venues:', error);
        }
    };

    const handleCreateVenue = async (e) => {
        e.preventDefault();
        if (!newVenueName) return;
        try {
            await api.post('/venues/', { name: newVenueName });
            setNewVenueName('');
            loadVenues();
        } catch (error) {
            console.error('Error creating venue:', error);
            alert('Error creating venue');
        }
    };

    const handleSelectVenue = (venueId) => {
        navigate(`/dashboard/${venueId}`);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Select Venue</h1>

                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Existing Venues</h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {venues.map(venue => (
                            <button
                                key={venue.id}
                                onClick={() => handleSelectVenue(venue.id)}
                                className="w-full text-left px-4 py-2 border rounded hover:bg-blue-50 hover:border-blue-500 transition-colors"
                            >
                                {venue.name}
                            </button>
                        ))}
                        {venues.length === 0 && <p className="text-gray-500 text-sm">No venues found.</p>}
                    </div>
                </div>

                <div className="border-t pt-6">
                    <h2 className="text-lg font-semibold mb-2">Create New Venue</h2>
                    <form onSubmit={handleCreateVenue} className="flex gap-2">
                        <input
                            type="text"
                            value={newVenueName}
                            onChange={(e) => setNewVenueName(e.target.value)}
                            placeholder="Venue Name"
                            className="flex-1 border rounded px-3 py-2"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
                            disabled={!newVenueName}
                        >
                            Add
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
