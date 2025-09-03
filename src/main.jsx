import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from './App.jsx'
import ItemVerifier from './ItemVerifier.jsx'; // We will create this next
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/item/:itemId" element={<ItemVerifier />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)