import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Preload critical components
const preloadComponents = () => {
  const components = [
    './components/FuturisticOrderConfirmation',
    './components/PersonalInfo',
    './components/WaitingRoom'
  ];

  components.forEach(component => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = component;
    document.head.appendChild(link);
  });
};

// Call preload on app init
preloadComponents();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
