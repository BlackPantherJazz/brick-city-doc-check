import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Fonts ship with the app (no Google request from the tenant's phone).
import '@fontsource/big-shoulders-display/700';
import '@fontsource/big-shoulders-display/900';
import '@fontsource/atkinson-hyperlegible/400';
import '@fontsource/atkinson-hyperlegible/700';
import '@fontsource/neonderthaw/400';
import '@fontsource/tilt-neon/400';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
