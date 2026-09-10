/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { extractLabelFromLocation } from './lib/labelParser';

// Pages
import PublicScanPage from './pages/PublicScanPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminLabels from './pages/AdminLabels';
import AdminGenerate from './pages/AdminGenerate';
import AdminTemplates from './pages/AdminTemplates';
import AdminLayout from './components/AdminLayout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 font-sans">Memuat...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

/**
 * Route handler for root or base scan paths:
 * If query parameter, hash, or pathname has a label (e.g. ?noLabel=002.0020, ?id=002.0020, ?q=002.0020),
 * or if query params exist, render PublicScanPage.
 * Otherwise, redirect to /admin/labels.
 */
const ScanOrRedirect = () => {
  const location = useLocation();
  const detectedLabel = extractLabelFromLocation(location);
  const hasSearch = !!location.search && location.search.length > 1;
  const hasHash = !!location.hash && location.hash.length > 1;

  if (detectedLabel || hasSearch || hasHash) {
    return <PublicScanPage />;
  }
  return <Navigate to="/admin/labels" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Scanned QR code routes with specific label parameter */}
          <Route path="/sertifikat/:noLabel" element={<PublicScanPage />} />
          <Route path="/scan/:noLabel" element={<PublicScanPage />} />
          <Route path="/verifikasi/:noLabel" element={<PublicScanPage />} />
          <Route path="/cert/:noLabel" element={<PublicScanPage />} />
          <Route path="/label/:noLabel" element={<PublicScanPage />} />

          {/* Paths with potential query parameters or fallback */}
          <Route path="/" element={<ScanOrRedirect />} />
          <Route path="/sertifikat" element={<ScanOrRedirect />} />
          <Route path="/sertifikat/*" element={<PublicScanPage />} />
          <Route path="/scan" element={<ScanOrRedirect />} />
          <Route path="/scan/*" element={<PublicScanPage />} />
          <Route path="/verifikasi" element={<ScanOrRedirect />} />
          <Route path="/verifikasi/*" element={<PublicScanPage />} />
          
          <Route path="/admin/login" element={<AdminLogin />} />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="labels" element={<AdminLabels />} />
            <Route path="generate" element={<AdminGenerate />} />
            <Route path="templates" element={<AdminTemplates />} />
          </Route>

          {/* Catch-all sends to PublicScanPage so custom or bare label paths (e.g. /002.0020) work */}
          <Route path="*" element={<PublicScanPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
