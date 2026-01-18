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
import DriverOrders from "./components/DriverOrders";
import DriverDelivered from "./components/DriverDelivered";
import DriverLayout from "./components/DriverLayout";
import ModernDashboardContent from "./components/ModernDashboardContent";
import DashboardLayout from "./components/DashboardLayout";
import VehiclesManagementNew from "./components/VehiclesManagementNew";
import OrdersManagementNew from "./components/OrdersManagementNew";
import DriversManagement from "./components/DriversManagement";
import UsersManagement from "./components/UsersManagement";
import Analytics from "./components/Analytics";
import Settings from "./components/Settings";
import UserDashboardLayout from "./components/user/UserDashboardLayout";
import CreateOrder from "./components/user/CreateOrder";
import OrdersInProgress from "./components/user/OrdersInProgress";
import OrdersHistory from "./components/user/OrdersHistory";
import UserSettings from "./components/user/UserSettings";
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
        
        {/* Admin routes - with DashboardLayout wrapper */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route path="map" element={<ModernDashboardContent />} />
          <Route path="vehicles" element={<VehiclesManagementNew />} />
          <Route path="orders" element={<OrdersManagementNew />} />
          <Route path="drivers" element={<DriversManagement />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route index element={<Navigate to="map" replace />} />
        </Route>
        
        {/* User routes - with UserDashboardLayout wrapper */}
        <Route path="/user" element={<UserDashboardLayout />}>
          <Route path="orders/create" element={<CreateOrder />} />
          <Route path="orders/in-progress" element={<OrdersInProgress />} />
          <Route path="orders/history" element={<OrdersHistory />} />
          <Route path="settings" element={<UserSettings />} />
          <Route index element={<Navigate to="orders/create" replace />} />
        </Route>
        
        {/* Driver routes - with DriverLayout wrapper */}
        <Route path="/driver" element={<DriverLayout />}>
          <Route index element={<DriverPage />} />
          <Route path="orders" element={<DriverOrders />} />
          <Route path="delivered" element={<DriverDelivered />} />
        </Route>
        
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