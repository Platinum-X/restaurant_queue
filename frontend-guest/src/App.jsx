import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GuestStatus from './GuestStatus';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:guestId" element={<GuestStatus />} />
        <Route path="/" element={
          <div className="min-h-screen flex items-center justify-center p-4 text-center text-gray-500">
            Please scan the QR code at the reception.
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
