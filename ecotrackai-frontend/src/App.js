import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOTPPage from './pages/VerifyOTPPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/admin/AdminDashboardPage';
import DeliveryRoutesPage from './pages/admin/DeliveryRoutesPage';
import ProductsPage from './pages/admin/ProductsPage';
import AlertsPage from './pages/admin/AlertsPage';
import authService from './services/auth.service';
import CarbonFootprintPage from './pages/admin/CarbonFootprintPage';
import ManagerPage from './pages/ManagerPage'; 
import EcoScorePage from './pages/admin/EcoScorePage';  
// Manager pages
import InventoryManagerPage from './pages/manager/InventoryManagerPage';
import LogisticsManagerPage from './pages/manager/LogisticsManagerPage';
import SustainabilityManagerPage from './pages/manager/SustainabilityManagerPage';
import FinanceManagerPage from './pages/manager/FinanceManagerPage';
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
         path="/inventory-manager" 
        element={<ProtectedRoute>
          <InventoryManagerPage />
          </ProtectedRoute>}
           />
        <Route
          path="/ecoscore"
          element={
            <ProtectedRoute>
              <EcoScorePage />
            </ProtectedRoute>
          }
        />
        <Route
  path="/logistics-manager"
  element={
    <ProtectedRoute>
      <LogisticsManagerPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/sustainability-manager"
  element={
    <ProtectedRoute>
      <SustainabilityManagerPage />
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