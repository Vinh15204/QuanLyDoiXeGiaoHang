import React, { useState, useEffect } from "react";
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate,
  createRoutesFromElements
} from "react-router-dom";
import Login from "./components/Login";
import UserPage from "./components/UserPage";
import DriverPage from "./components/DriverPage";
import AdminDashboard from "./components/AdminDashboard";
import { RouteProvider } from "./contexts/RouteContext";
import "./styles/globals.css";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Khởi tạo state ngay từ đầu thay vì dùng useEffect
    return localStorage.getItem('currentUser');
  });

  console.log('🔍 App.js - isLoggedIn:', isLoggedIn ? 'YES' : 'NO');
  console.log('🔍 App.js rendered at:', window.location.pathname);

  try {
    return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin routes - NO RouteProvider */}
        <Route path="/admin">
          <Route path="map" element={<AdminDashboard />} />
          <Route path="info" element={<AdminDashboard />} />
          <Route path="vehicles" element={<AdminDashboard />} />
          <Route path="orders" element={<AdminDashboard />} />
          <Route path="drivers" element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminDashboard />} />
          <Route path="settings" element={<AdminDashboard />} />
          <Route index element={<Navigate to="map" replace />} />
        </Route>
        
        {/* User routes - WITH RouteProvider for backward compatibility */}
        <Route path="/user/*" element={
          <RouteProvider>
            <UserPage />
          </RouteProvider>
        } />
        
        <Route path="/driver/*" element={<DriverPage />} />
        
        {/* Root route - redirect based on login status */}
        <Route path="/" element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : (
            (() => {
              try {
                const user = JSON.parse(isLoggedIn);
                console.log('🔄 Redirecting to:', `/${user.role}`);
                return <Navigate to={`/${user.role}`} replace />;
              } catch (error) {
                console.error('❌ Error parsing user:', error);
                localStorage.removeItem('currentUser');
                return <Navigate to="/login" replace />;
              }
            })()
          )
        } />
      </Routes>
    </BrowserRouter>
    );
  } catch (error) {
    console.error('❌ App.js render error:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error loading application</h1>
        <pre>{error.message}</pre>
        <button onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}>Clear cache and reload</button>
      </div>
    );
  }
}

export default App;