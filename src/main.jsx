import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/global.css';
import MenuPage from './pages/MenuPage';
import AdminPage from './pages/AdminPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<MenuPage />} />
        <Route path="/admin"  element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
