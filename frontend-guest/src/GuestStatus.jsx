import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from './api';
import { Clock, Bell, Coffee, XCircle, AlertCircle } from 'lucide-react';

export default function GuestStatus() {
    const { guestId } = useParams();
    const [guest, setGuest] = useState(null);
    const [error, setError] = useState(null);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const prevStatusRef = React.useRef(null);
    const audioCtxRef = React.useRef(null);

    const unlockAudio = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }

        // Play silent sound to trigger unlock
        const oscillator = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0; // Silent
        oscillator.start();
        oscillator.stop(audioCtxRef.current.currentTime + 0.1);

        setAudioUnlocked(true);
    };

    const playBuzzer = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }

        const audioCtx = audioCtxRef.current;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sawtooth'; // More aggressive sound
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.5); // Siren-like

        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // LOUD
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    };

    const handleAcknowledge = async () => {
        if (!guest) return;
        try {
            await api.put(`/guests/${guest.id}/status`, { status: 'ACKNOWLEDGED' });
            // Optimistic update
            setGuest(prev => ({ ...prev, status: 'ACKNOWLEDGED' }));
        } catch (err) {
            console.error("Failed to acknowledge", err);
        }
    };

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await api.get(`/guests/${guestId}`);
                setGuest(response.data);
                setError(null);
            } catch (err) {
                setError("Could not find your reservation.");
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 3000); // 3s polling for guests
        return () => clearInterval(interval);
    }, [guestId]);

    useEffect(() => {
        let soundInterval;
        if (guest && guest.status === 'READY') {
            // Play immediately then every 5 seconds
            playBuzzer();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);

            soundInterval = setInterval(() => {
                playBuzzer();
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
            }, 5000);
        }
        return () => {
            if (soundInterval) clearInterval(soundInterval);
        };
    }, [guest]); // Dependency on guest means status changes trigger this

    if (error) {
        return (
            <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-gray-800">Something went wrong</h1>
                <p className="text-gray-600">{error}</p>
            </div>
        );
    }

    if (!guest) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            {guest.status === 'WAITING' && (
                <>
                    <div className="bg-blue-100 p-6 rounded-full mb-6 animate-pulse">
                        <Clock size={64} className="text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">You're in the queue</h1>
                    <p className="text-gray-600 text-lg mb-8">
                        Hi {guest.name}, thanks for waiting. We'll notify you here when your table is ready.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border w-full max-w-sm">
                        <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Party Size</div>
                        <div className="text-2xl font-semibold">{guest.party_size} People</div>
                    </div>

                    {!audioUnlocked && (
                        <div className="mt-8">
                            <button
                                onClick={unlockAudio}
                                className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg animate-bounce flex items-center gap-2 mx-auto"
                            >
                                <Bell size={20} /> Tap to Enable Buzzer
                            </button>
                            <p className="text-xs text-gray-400 mt-2">Required for sound alerts</p>
                        </div>
                    )}
                </>
            )}

            {guest.status === 'READY' && (
                <>
                    <div className="bg-green-100 p-6 rounded-full mb-6 animate-bounce">
                        <Bell size={64} className="text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-green-800 mb-2">Your table is ready!</h1>
                    <p className="text-gray-600 text-lg mb-8">
                        Please proceed to the reception desk immediately.
                    </p>
                    <button
                        onClick={handleAcknowledge}
                        className="bg-green-600 text-white text-xl px-12 py-6 rounded-xl font-bold hover:bg-green-700 shadow-xl animate-pulse"
                    >
                        I'M COMING!
                    </button>
                    {!audioUnlocked && (
                        <div className="mt-4">
                            <button onClick={unlockAudio} className="text-sm underline text-red-500">Enable Sound</button>
                        </div>
                    )}
                </>
            )}

            {guest.status === 'ACKNOWLEDGED' && (
                <>
                    <div className="bg-blue-100 p-6 rounded-full mb-6">
                        <Coffee size={64} className="text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">See you soon!</h1>
                    <p className="text-gray-600 text-lg">
                        You have acknowledged the alert. Please head to reception.
                    </p>
                </>
            )}

            {guest.status === 'SEATED' && (
                <>
                    <div className="bg-purple-100 p-6 rounded-full mb-6">
                        <Coffee size={64} className="text-purple-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-purple-900 mb-2">Enjoy your meal!</h1>
                    <p className="text-gray-600 text-lg">
                        You have been seated.
                    </p>
                </>
            )}

            {guest.status === 'CANCELLED' && (
                <>
                    <div className="bg-red-100 p-6 rounded-full mb-6">
                        <XCircle size={64} className="text-red-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-red-900 mb-2">Reservation Cancelled</h1>
                    <p className="text-gray-600 text-lg">
                        {guest.cancellation_reason || "Your reservation has been cancelled."}
                    </p>
                </>
            )}
        </div>
    );
}
