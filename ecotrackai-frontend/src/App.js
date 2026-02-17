import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOTPPage from './pages/VerifyOTPPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import DeliveryRoutesPage from './pages/DeliveryRoutesPage';
import ProductsPage from './pages/ProductsPage';
import AlertsPage from './pages/AlertsPage';
import authService from './services/auth.service';
import CarbonFootprintPage from './pages/CarbonFootprintPage';
import ManagerPage from './pages/ManagerPage'; 
import EcoScorePage from './pages/EcoScorePage';  
// Protected Route Component
const ProtectedRoute = ({ children }) => {
  return authService.isAuthenticated() ? <>{children}</> : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOTPPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deliveries"
          element={
            <ProtectedRoute>
              <DeliveryRoutesPage />
            </ProtectedRoute>
          }
        />
      
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
  path="/carbon"
  element={
    <ProtectedRoute>
      <CarbonFootprintPage />
    </ProtectedRoute>
  }
/>
  <Route
          path="/managers"
          element={
            <ProtectedRoute>
              <ManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ecoscore"
          element={
            <ProtectedRoute>
              <EcoScorePage />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;