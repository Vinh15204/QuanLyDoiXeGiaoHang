import React from "react";
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
import "./App.css";

function App() {
  const isLoggedIn = localStorage.getItem('currentUser');

  return (
    <BrowserRouter future={{ v7_startTransition: true }}>
      <Routes>
        <Route path="/login" element={!isLoggedIn ? <Login /> : <Navigate to="/" />} />
        <Route path="/admin" element={<AdminDashboard />}>
          <Route path="map" element={<AdminDashboard />} />
          <Route path="info" element={<AdminDashboard />} />
          <Route index element={<Navigate to="map" replace />} />
        </Route>
        <Route path="/user/*" element={<UserPage />} />
        <Route path="/driver/*" element={<DriverPage />} />
        <Route path="/" element={
          isLoggedIn ? 
            <Navigate to={`/${JSON.parse(isLoggedIn).role}`} /> : 
            <Navigate to="/login" />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;