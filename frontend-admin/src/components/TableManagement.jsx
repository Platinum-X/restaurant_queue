import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Users, LayoutGrid } from 'lucide-react';

export default function TableManagement({ venueId, tables, onRefresh, onAvailableClick }) {
    const [newTableNumber, setNewTableNumber] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    // Note: 'tables' is now a prop, no local state for it


    // Removed loadTables since data comes from parent props


    const handleAddTable = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/venues/${venueId}/tables/`, {
                table_number: newTableNumber,
                capacity: parseInt(newTableCapacity),
                status: 'AVAILABLE'
            });
            setNewTableNumber('');
            setNewTableCapacity('');
            setIsAdding(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error adding table:', error);
            alert('Failed to add table');
        }
    };

    const toggleTableStatus = async (table) => {
        const newStatus = table.status === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';
        try {
            await api.put(`/tables/${table.id}`, { status: newStatus });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error updating table:', error);
        }
    };

    const [history, setHistory] = useState({}); // { tableId: [guests] }

    useEffect(() => {
        // Fetch history for all tables
        tables.forEach(t => fetchHistory(t.id));
    }, [tables]);

    const fetchHistory = async (tableId) => {
        try {
            const res = await api.get(`/tables/${tableId}/history`);
            setHistory(prev => ({ ...prev, [tableId]: res.data }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleWalkIn = async (e) => {
        e.preventDefault();
        // Create WALKIN guest and seat immediately
    };

    const handleTableClick = async (table) => {
        if (table.status === 'OCCUPIED') {
            if (window.confirm("Mark table as Cleardown? (This will complete the current guest)")) {
                await api.put(`/tables/${table.id}`, { status: 'CLEARDOWN' });
                if (onRefresh) onRefresh();
            }
        } else if (table.status === 'CLEARDOWN') {
            await api.put(`/tables/${table.id}`, { status: 'AVAILABLE' });
            if (onRefresh) onRefresh();
        } else if (table.status === 'CLOSED') {
            await api.put(`/tables/${table.id}`, { status: 'AVAILABLE' });
            if (onRefresh) onRefresh();
        } else if (table.status === 'AVAILABLE') {
            // Open Modal for Walk-in or Close
            onAvailableClick(table);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <LayoutGrid size={24} /> Tables
                </h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-green-700 text-sm"
                >
                    <Plus size={16} /> Add Table
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddTable} className="mb-6 p-4 bg-gray-50 rounded border">
                    {/* ... form content ... */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Table Number/Name</label>
                            <input
                                type="text"
                                value={newTableNumber}
                                onChange={e => setNewTableNumber(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                            <input
                                type="number"
                                value={newTableCapacity}
                                onChange={e => setNewTableCapacity(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save Table</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map(table => (
                    <div
                        key={table.id}
                        className={`cursor-pointer border-2 rounded-lg p-4 transition-colors relative ${table.status === 'AVAILABLE' ? 'border-green-500 bg-green-50 hover:bg-green-100' :
                            table.status === 'OCCUPIED' ? 'border-red-300 bg-red-50 hover:bg-red-100' :
                                table.status === 'CLEARDOWN' ? 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100' :
                                    'border-gray-300 bg-gray-100 hover:bg-gray-200'
                            }`}
                        onClick={() => handleTableClick(table)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-lg">{table.table_number}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${table.status === 'AVAILABLE' ? 'bg-green-200 text-green-800' :
                                table.status === 'OCCUPIED' ? 'bg-red-200 text-red-800' :
                                    table.status === 'CLEARDOWN' ? 'bg-yellow-200 text-yellow-800' :
                                        'bg-gray-200 text-gray-800'
                                }`}>
                                {table.status}
                            </span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                            <Users size={16} className="mr-1" /> {table.capacity}
                        </div>
                        {table.status === 'OCCUPIED' && table.active_guest && (
                            <div className="mt-2 pt-2 border-t border-red-200 text-xs text-red-800">
                                <div className="font-semibold">{table.active_guest.name}</div>
                                <div>Party of {table.active_guest.party_size}</div>
                            </div>
                        )}

                        {/* History */}
                        <div className="mt-4 pt-2 border-t border-gray-200">
                            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Today's Guests</div>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                                {history[table.id]?.map(g => (
                                    <div key={g.id} className="text-[10px] flex justify-between text-gray-600">
                                        <span>{g.name} ({g.party_size})</span>
                                        <span>{new Date(g.seated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))}
                                {(!history[table.id] || history[table.id].length === 0) && (
                                    <div className="text-[10px] text-gray-400 italic">No guests yet</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Add onAvailableClick prop to component definition
// Need to modify Dashboard to pass this prop & handle modal

