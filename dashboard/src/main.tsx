import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Landing from './Landing.tsx';
import App from './App.tsx';
import FlagDetail from './FlagDetail.tsx';
import Segments from './Segments.tsx';
import SegmentDetail from './SegmentDetail.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/flags/:id" element={<FlagDetail />} />
        <Route path="/segments" element={<Segments />} />
        <Route path="/segments/:id" element={<SegmentDetail />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);