
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { DataProvider } from './contexts/DataProvider';
import './index.css';

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Determine SW Path:
    // If in WP, use the localized plugin_url setting.
    // If local dev, assume root sw.js.
    const swPath = window.wpApiSettings?.plugin_url
      ? `${window.wpApiSettings.plugin_url}sw.js`
      : '/sw.js';

    navigator.serviceWorker.register(swPath).then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>
);
