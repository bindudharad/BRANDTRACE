import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root')!;

if (container.hasChildNodes()) {
  hydrateRoot(
    container,
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Register minimal passthrough service worker for PWA installability
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const swPath = `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}sw.js`;
    navigator.serviceWorker.register(swPath).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

