import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SpeedInsights } from "@vercel/speed-insights/react";
import GitformeUi from './components/gitformeUi';
import VulnerabilityScanPage from './components/VulnerabilityScanPage';
import Login from '../pages/Login';
import RepoPage from '../pages/gitpage';
import ProtectedRoute from './components/ProtectedRoute';
import { Analytics } from "@vercel/analytics/react"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<GitformeUi />} />
        <Route path="/vulnerability-scan" element={<VulnerabilityScanPage />} />
        <Route path="/:username/:reponame" element={<GitformeUi />} />
        <Route path="/login" element={<Login />} />
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
