import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ReactGA from "react-gtag";
import { BrowserRouter } from 'react-router-dom';

// Initialize Google Analytics
ReactGA.initialize("G-3CGD1VB8CG"); // Your Measurement ID

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
