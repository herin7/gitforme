import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SpeedInsights } from "@vercel/speed-insights/react";
import GitformeUi from './components/gitformeUi';
import VulnerabilityScanPage from './components/VulnerabilityScanPage';
import RepoPage from '../pages/gitpage';
import ProtectedRoute from './components/ProtectedRoute';
import DomainShiftBanner from './components/DomainShiftBanner';
import { Analytics } from "@vercel/analytics/react"

const AUTH_ERRORS = {
  auth_failed: 'GitHub sign-in failed. Please try again.',
  session_expired: 'Your session expired. Please sign in again.',
};

// /login was a bare duplicate of the landing page's sign-in button, styled with
// classes that exist in no stylesheet. Bounce to the landing page instead. The
// route stays because the server still redirects here with ?error= when OAuth
// fails, and that reason is worth showing rather than swallowing.
const LoginRedirect = () => {
  const error = new URLSearchParams(useLocation().search).get('error');

  useEffect(() => {
    if (error) toast.error(AUTH_ERRORS[error] || 'Please sign in to continue.');
  }, [error]);

  return <Navigate to="/" replace />;
};

function App() {
  return (
    <>
      <DomainShiftBanner />
      <Routes>
        <Route path="/" element={<GitformeUi />} />
        <Route path="/vulnerability-scan" element={<VulnerabilityScanPage />} />
        <Route path="/:username/:reponame" element={<GitformeUi />} />
        <Route path="/login" element={<LoginRedirect />} />
        <Route path="*" element={<div color='red'>404 - Page Not Found</div>} />
      </Routes>

      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;
