import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SavedProvider } from './context/SavedContext';
import './index.css';

// The static Pages build uses HashRouter so client-side routes work without
// any server rewrites (and survive a hard refresh on a subpage).
const Router = import.meta.env.VITE_STATIC === 'true' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <SavedProvider>
          <App />
        </SavedProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);

// Register the service worker so the site is installable as a PWA and works
// offline. Only in production builds (skips the Vite dev server).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ });
  });
}
