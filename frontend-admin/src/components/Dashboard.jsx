import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import TableManagement from './TableManagement';
import { QRCodeSVG } from 'qrcode.react';
import { Users, UserPlus, Bell, Armchair, XCircle, LogOut, CheckCircle, Clock } from 'lucide-react';

export default function Dashboard() {
    const { venueId } = useParams();
    const [activeGuests, setActiveGuests] = useState([]);
    const [pastGuests, setPastGuests] = useState([]);
    const [tables, setTables] = useState([]);
    const [venue, setVenue] = useState(null);
    const [newGuestName, setNewGuestName] = useState('');
    const [newGuestParty, setNewGuestParty] = useState('');

    // Modals
    const [showCancelModal, setShowCancelModal] = useState(null);
    const [showSeatModal, setShowSeatModal] = useState(null);
    const [showAvailableModal, setShowAvailableModal] = useState(null); // table object
    const [showSkipQueueModal, setShowSkipQueueModal] = useState(null); // { table, partySize, name }
    const [showClearGuestModal, setShowClearGuestModal] = useState(null); // guest object

    const [cancelReason, setCancelReason] = useState('');
    const [cancelType, setCancelType] = useState('Staff Cancelled');
    const [guestBaseUrl, setGuestBaseUrl] = useState('https://torpid-cira-noncontiguously.ngrok-free.dev');
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [expandedQR, setExpandedQR] = useState(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [venueRes, activeGuestsRes, pastGuestsRes, tablesRes] = await Promise.all([
                    api.get(`/venues/${venueId}`),
                    api.get(`/venues/${venueId}/guests?status=WAITING&status=READY&status=ACKNOWLEDGED&status=SEATED`),
                    api.get(`/venues/${venueId}/guests?status=COMPLETED&status=CANCELLED&created_after=${new Date(new Date().setHours(0, 0, 0, 0)).toISOString()}`),
                    api.get(`/venues/${venueId}/tables/`)
                ]);
                setVenue(venueRes.data);
                setActiveGuests(activeGuestsRes.data);
                setPastGuests(pastGuestsRes.data);
                setTables(tablesRes.data);
            } catch (err) {
                console.error("Error loading dashboard data", err);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [venueId]);

    // Derived Lists
    const queuedGuests = activeGuests.filter(g => ['WAITING', 'READY', 'ACKNOWLEDGED'].includes(g.status));
    const seatedGuests = activeGuests.filter(g => g.status === 'SEATED');
    // pastGuests is now fetched directly via API


    const handleAddGuest = async (e) => {
        e.preventDefault();
        const partySize = parseInt(newGuestParty);

        // Check for available table
        const availableTable = tables
            .filter(t => t.status === 'AVAILABLE' && t.capacity >= partySize)
            .sort((a, b) => a.capacity - b.capacity)[0];

        if (availableTable) {
            // Open Skip Queue Modal instead of confirm
            setShowSkipQueueModal({
                table: availableTable,
                name: newGuestName,
                partySize: partySize
            });
            return;
        }

        try {
            await api.post('/guests/', {
                name: newGuestName,
                party_size: partySize,
                venue_id: parseInt(venueId)
            });
            setNewGuestName('');
            setNewGuestParty('');
        } catch (err) {
            alert("Failed to add guest");
        }
    };

    const confirmSkipQueue = async () => {
        if (!showSkipQueueModal) return;
        try {
            await api.post('/guests/', {
                name: showSkipQueueModal.name,
                party_size: showSkipQueueModal.partySize,
                venue_id: parseInt(venueId),
                table_id: showSkipQueueModal.table.id,
                status: 'SEATED'
            });
            setShowSkipQueueModal(null);
            setNewGuestName('');
            setNewGuestParty('');
        } catch (err) {
            console.error("Failed to quick seat", err);
        }
    };

    const addToQueueInstead = async () => {
        if (!showSkipQueueModal) return;
        try {
            await api.post('/guests/', {
                name: showSkipQueueModal.name,
                party_size: showSkipQueueModal.partySize,
                venue_id: parseInt(venueId)
            });
            setShowSkipQueueModal(null);
            setNewGuestName('');
            setNewGuestParty('');
        } catch (err) {
            alert("Failed to add guest");
        }
    };

    const updateStatus = async (guestId, status, tableId = null) => {
        try {
            await api.put(`/guests/${guestId}/status`, { status, table_id: tableId });
            setShowSeatModal(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSeatClick = (guest) => {
        setShowSeatModal(guest);
    };

    const handleAutoAssign = () => {
        if (!showSeatModal) return;
        const bestTable = tables
            .filter(t => t.status === 'AVAILABLE' && t.capacity >= showSeatModal.party_size)
            .sort((a, b) => a.capacity - b.capacity)[0];

        if (bestTable) {
            updateStatus(showSeatModal.id, 'SEATED', bestTable.id);
        } else {
            alert("No suitable table found fitting this party size.");
        }
    };

    const handleManualAssign = (tableId) => {
        if (!showSeatModal) return;
        updateStatus(showSeatModal.id, 'SEATED', tableId);
    };

    const handleWalkIn = async (e) => {
        e.preventDefault();
        if (!showAvailableModal) return;
        try {
            await api.post('/guests/', {
                name: newGuestName,
                party_size: parseInt(newGuestParty),
                venue_id: parseInt(venueId),
                table_id: showAvailableModal.id,
                status: 'SEATED'
            });
            setShowAvailableModal(null);
            setNewGuestName('');
            setNewGuestParty('');
        } catch (err) {
            console.error("Walkin failed", err);
        }
    };

    const handleCloseTable = async () => {
        if (!showAvailableModal) return;
        try {
            await api.put(`/tables/${showAvailableModal.id}`, { status: 'CLOSED' });
            setShowAvailableModal(null);
        } catch (err) {
            console.error("Close table failed", err);
        }
    };

    const handleCancelGuest = async () => {
        if (!showCancelModal) return;
        try {
            await api.put(`/guests/${showCancelModal}/status`, {
                status: 'CANCELLED',
                cancellation_reason: `${cancelType}: ${cancelReason}`
            });
            setShowCancelModal(null);
            setCancelReason('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleClearGuest = async () => {
        if (!showClearGuestModal) return;
        try {
            await api.put(`/tables/${showClearGuestModal.table_id}`, { status: 'CLEARDOWN' });
            setShowClearGuestModal(null);
            // Polling updates lists
        } catch (err) {
            console.error("Clear guest failed", err);
        }
    };

    const guestUrl = (guestId) => `${guestBaseUrl}/${guestId}`;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow p-4 flex justify-between items-center z-10">
                <h1 className="text-2xl font-bold text-blue-900">{venue?.name || 'Loading...'}</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Guest Link Base:</span>
                        {isEditingUrl ? (
                            <input
                                value={guestBaseUrl}
                                onChange={e => setGuestBaseUrl(e.target.value)}
                                onBlur={() => setIsEditingUrl(false)}
                                className="border rounded px-2 py-1"
                                autoFocus
                            />
                        ) : (
                            <span
                                onClick={() => setIsEditingUrl(true)}
                                className="cursor-pointer hover:text-blue-600 border-b border-dashed border-gray-400"
                            >
                                {guestBaseUrl}
                            </span>
                        )}
                    </div>
                    <Link to="/" className="text-gray-600 hover:text-red-500 flex items-center gap-1">
                        <LogOut size={18} /> Switch Venue
                    </Link>
                </div>
            </header>

            <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Guest Lists */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Add Guest Form */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <UserPlus className="text-blue-600" /> New Guest
                        </h2>
                        <form onSubmit={handleAddGuest} className="flex gap-4">
                            <input
                                className="flex-1 border rounded px-3 py-2"
                                placeholder="Guest Name"
                                value={newGuestName}
                                onChange={e => setNewGuestName(e.target.value)}
                                required
                            />
                            <input
                                className="w-32 border rounded px-3 py-2"
                                type="number"
                                placeholder="Party Size"
                                value={newGuestParty}
                                onChange={e => setNewGuestParty(e.target.value)}
                                required
                            />
                            <button className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700">
                                Join Queue
                            </button>
                        </form>
                    </div>

                    {/* Current Queue */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <h2 className="text-lg font-semibold p-6 border-b bg-gray-50 flex justify-between">
                            <span>Current Queue <span className="text-gray-500 text-sm font-normal">({queuedGuests.length})</span></span>
                        </h2>
                        <div className="divide-y">
                            {queuedGuests.map(guest => (
                                <div key={guest.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="bg-gray-100 p-2 rounded cursor-pointer hover:bg-blue-50 transition-colors"
                                            onClick={() => setExpandedQR(guest)}
                                        >
                                            <QRCodeSVG value={guestUrl(guest.id)} size={48} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">{guest.name}</div>
                                            <div className="text-gray-500 text-sm flex items-center gap-1">
                                                <Users size={14} /> Party of {guest.party_size}
                                                <span className="mx-2">•</span>
                                                Waited {Math.floor((now - new Date(guest.created_at)) / 60000)}m
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {guest.status === 'WAITING' && (
                                            <button
                                                onClick={() => updateStatus(guest.id, 'READY')}
                                                className="bg-yellow-500 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-yellow-600"
                                            >
                                                <Bell size={16} /> Call
                                            </button>
                                        )}
                                        {guest.status === 'ACKNOWLEDGED' && (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-green-600 flex items-center gap-1 font-medium text-sm">
                                                    <CheckCircle size={14} /> Acknowledged
                                                </span>
                                                <button
                                                    onClick={() => handleSeatClick(guest)}
                                                    className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-green-700 mt-1"
                                                >
                                                    <Armchair size={16} /> Seat
                                                </button>
                                            </div>
                                        )}
                                        {guest.status === 'READY' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-yellow-600 text-sm font-medium animate-pulse">Calling...</span>
                                                <button
                                                    onClick={() => handleSeatClick(guest)}
                                                    className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-green-700"
                                                >
                                                    <Armchair size={16} /> Seat
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setShowCancelModal(guest.id)}
                                            className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-200"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {queuedGuests.length === 0 && (
                                <div className="p-8 text-center text-gray-500">Queue is empty</div>
                            )}
                        </div>
                    </div>

                    {/* Current Guests (Seated) */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <h2 className="text-lg font-semibold p-6 border-b bg-gray-50 flex justify-between">
                            <span>Current Guests <span className="text-gray-500 text-sm font-normal">({seatedGuests.length})</span></span>
                        </h2>
                        <div className="divide-y">
                            {seatedGuests.map(guest => {
                                const table = tables.find(t => t.id === guest.table_id);
                                return (
                                    <div key={guest.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="font-bold text-lg">{guest.name}</div>
                                                <div className="text-gray-500 text-sm flex items-center gap-2">
                                                    <Users size={14} /> {guest.party_size}
                                                    <span>•</span>
                                                    <span className="font-medium text-blue-800">Table {table?.table_number || '?'}</span>
                                                    <span>•</span>
                                                    <Clock size={14} /> {Math.floor((now - new Date(guest.seated_at || guest.created_at)) / 60000)}m
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowClearGuestModal(guest)}
                                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                                        >
                                            Clear Guest
                                        </button>
                                    </div>
                                )
                            })}
                            {seatedGuests.length === 0 && (
                                <div className="p-8 text-center text-gray-500">No guests seated</div>
                            )}
                        </div>
                    </div>

                    {/* Past Guests */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <h2 className="text-lg font-semibold p-6 border-b bg-gray-50 flex justify-between">
                            <span>Past Guests (Today) <span className="text-gray-500 text-sm font-normal">({pastGuests.length})</span></span>
                        </h2>
                        <div className="divide-y">
                            {pastGuests.map(guest => {
                                const duration = guest.left_at && guest.seated_at
                                    ? Math.floor((new Date(guest.left_at) - new Date(guest.seated_at)) / 60000)
                                    : null;
                                return (
                                    <div key={guest.id} className="p-3 px-6 flex items-center justify-between hover:bg-gray-50 opacity-75">
                                        <div>
                                            <div className="font-medium">{guest.name}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span className={`px-1 rounded ${guest.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{guest.status}</span>
                                                {duration && <span>Dined for {duration}m</span>}
                                                {!duration && <span>Cancelled</span>}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(guest.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Tables */}
                <div className="space-y-6">
                    <TableManagement
                        venueId={venueId}
                        tables={tables}
                        onRefresh={() => { /* Polling handles it */ }}
                        onAvailableClick={(table) => setShowAvailableModal(table)}
                    />
                </div>
            </main>

            {/* QR Modal */}
            {expandedQR && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" onClick={() => setExpandedQR(null)}>
                    <div className="bg-white p-8 rounded-lg flex flex-col items-center max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <h2 className="text-3xl font-bold mb-2">{expandedQR.name}</h2>
                        <p className="text-gray-500 mb-6">Party of {expandedQR.party_size}</p>
                        <div className="p-4 border-4 border-gray-900 rounded-lg">
                            <QRCodeSVG value={guestUrl(expandedQR.id)} size={300} level="H" />
                        </div>
                        <p className="mt-6 text-center text-gray-500 break-all font-mono text-sm bg-gray-100 p-2 rounded">
                            {guestUrl(expandedQR.id)}
                        </p>
                        <button
                            onClick={() => setExpandedQR(null)}
                            className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Cancel Guest</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select
                                value={cancelType}
                                onChange={e => setCancelType(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option>Guest Cancelled</option>
                                <option>Staff Cancelled</option>
                            </select>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                            <input
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                placeholder="e.g. Changed mind"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowCancelModal(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCancelGuest}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Seat Modal */}
            {showSeatModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-2">Seat {showSeatModal.name}</h3>
                        <p className="text-gray-500 mb-6">Party Size: {showSeatModal.party_size}</p>

                        <div className="space-y-4">
                            <button
                                onClick={handleAutoAssign}
                                className="w-full bg-blue-100 text-blue-700 py-3 rounded-lg font-semibold hover:bg-blue-200 border border-blue-200 flex flex-col items-center"
                            >
                                <span>✨ Auto-Assign Best Table</span>
                                <span className="text-xs font-normal">Finds smallest available table ≥ {showSeatModal.party_size}</span>
                            </button>

                            <div className="border-t pt-4">
                                <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase">Or Select Table Manually</h4>
                                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                    {tables.filter(t => t.status === 'AVAILABLE').map(table => (
                                        <button
                                            key={table.id}
                                            onClick={() => handleManualAssign(table.id)}
                                            disabled={table.capacity < showSeatModal.party_size}
                                            className={`p-2 rounded border text-sm flex flex-col items-center ${table.capacity < showSeatModal.party_size
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'hover:bg-green-50 hover:border-green-500 hover:text-green-700'
                                                }`}
                                        >
                                            <span className="font-bold">Table {table.table_number}</span>
                                            <span className="text-xs">Cap: {table.capacity}</span>
                                        </button>
                                    ))}
                                    {tables.filter(t => t.status === 'AVAILABLE').length === 0 && (
                                        <div className="col-span-3 text-center text-gray-500 text-sm py-2">
                                            No tables available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowSeatModal(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Available Table Modal (Walk-in / Close) */}
            {showAvailableModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Table {showAvailableModal.table_number}</h3>
                        <div className="space-y-4">
                            <div className="border rounded p-4 bg-blue-50">
                                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                    <UserPlus size={16} /> Walk-In Guest
                                </h4>
                                <form onSubmit={handleWalkIn} className="space-y-2">
                                    <input
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="Guest Name"
                                        value={newGuestName}
                                        onChange={e => setNewGuestName(e.target.value)}
                                        required
                                    />
                                    <input
                                        className="w-full border rounded px-3 py-2"
                                        type="number"
                                        placeholder="Party Size"
                                        value={newGuestParty}
                                        onChange={e => setNewGuestParty(e.target.value)}
                                        required
                                    />
                                    <button className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700">
                                        Seat Walk-In
                                    </button>
                                </form>
                            </div>

                            <div className="text-center text-gray-400 text-sm">- OR -</div>

                            <button
                                onClick={handleCloseTable}
                                className="w-full border-2 border-red-200 text-red-600 rounded py-2 font-medium hover:bg-red-50"
                            >
                                Close Table
                            </button>

                            <button
                                onClick={() => setShowAvailableModal(null)}
                                className="w-full text-gray-500 hover:bg-gray-100 rounded py-2"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Skip Queue Modal */}
            {showSkipQueueModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-4 border-green-500">
                        <h3 className="text-lg font-bold mb-2">Table Available!</h3>
                        <p className="text-gray-600 mb-4">
                            Table <strong>{showSkipQueueModal.table.table_number}</strong> (Cap: {showSkipQueueModal.table.capacity}) is available for this party size.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmSkipQueue}
                                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
                            >
                                Seat Immediately (Skip Queue)
                            </button>
                            <button
                                onClick={addToQueueInstead}
                                className="w-full bg-blue-100 text-blue-800 py-2 rounded-lg font-medium hover:bg-blue-200"
                            >
                                No, Just Add to Queue
                            </button>
                            <button
                                onClick={() => setShowSkipQueueModal(null)}
                                className="w-full text-gray-400 text-sm py-2 hover:text-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Guest Modal */}
            {showClearGuestModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-2">Clear Table?</h3>
                        <p className="text-gray-600 mb-6">
                            Mark <strong>{showClearGuestModal.name}</strong> as completed and set table to Cleardown?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowClearGuestModal(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearGuest}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                            >
                                Confirm Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
