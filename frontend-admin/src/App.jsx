import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import VenueLogin from './components/VenueLogin';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VenueLogin />} />
        <Route path="/dashboard/:venueId" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
