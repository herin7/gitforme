import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ChatbotPanel from './Chatbot';
import RepoDetailView from './RepoDetailView';
import LandingPageContent from '../PageContent/LandingPageContent';
import { AppHeader } from '../PageContent/AppHeader';

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const LaptopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55A1 1 0 0 1 20.28 20H3.72a1 1 0 0 1-.98-1.45L4 16"/>
  </svg>
);

// --- Login Prompt Modal Component ---
const LoginPromptModal = ({ onLogin, onClose }) => (
    <motion.div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
    >
        <motion.div
            className="bg-white rounded-lg p-8 shadow-2xl text-center max-w-sm"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
        >
            <h2 className="text-2xl font-bold mb-3 text-gray-800">Usage Limit Reached</h2>
            <p className="text-gray-600 mb-6">
                You've reached your free usage limit, or the public GitHub API rate limit was exceeded. Please log in to continue.
            </p>
            <button
                onClick={onLogin}
                className="w-full bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors duration-300"
            >
                Login with GitHub
            </button>
            <button
                onClick={onClose}
                className="mt-3 text-sm text-gray-500 hover:underline"
            >
                Close
            </button>
        </motion.div>
    </motion.div>
);

const GitformeUi = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const { username, reponame } = useParams();

  // Utility to robustly strip .git from any part of repo URL
  const stripGitSuffix = (name) => {
    if (typeof name === 'string') {
      return name.replace(/\.git$/i, '');
    }
    return name;
  };

  const [repoUrl, setRepoUrl] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBraveBrowser, setIsBraveBrowser] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const [apiDown, setApiDown] = useState(false);
  const UNAUTHENTICATED_USAGE_LIMIT = 2;
  const apiServerUrl = import.meta.env.VITE_API_URL;

  // Auto-load repo and show correct URL in search bar
  useEffect(() => {
    let canonicalUsername = username ? stripGitSuffix(username) : 'herin7';
    let canonicalRepo = reponame ? stripGitSuffix(reponame) : 'gitforme';
    if (canonicalUsername && canonicalRepo) {
      setRepoUrl(`https://github.com/${canonicalUsername}/${canonicalRepo}`);
    } else {
      setRepoUrl('https://github.com/herin7/gitforme');
    }
  }, [username, reponame]);

  
  useEffect(() => {
    const checkForBrave = async () => {
      if (navigator.brave && await navigator.brave.isBrave()) {
        setIsBraveBrowser(true);
      }
    };
    checkForBrave();
  }, []);

  const handleGitHubLogin = () => {
    const redirectUrl = `${apiServerUrl}/api/auth/github`
    try {
    console.log(`Attempting to redirect to: ${redirectUrl}`);
    window.location.href = redirectUrl;
  } catch (error) {
    console.error("THE REDIRECT FAILED! The browser threw an error:", error);
  }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  
  const handleCookRepoUrl = () => {
    if (!repoUrl) {
      alert('Please enter a GitHub repository URL.');
      return;
    }
    try {
      const url = new URL(repoUrl);
      const pathParts = url.pathname.split('/').filter(part => part);

      if (pathParts.length < 2) {
        alert('Invalid GitHub repository URL format. Example: https://github.com/owner/repo');
        return;
      }

      // Strip .git from both username and repo name if present
      const cleanUsername = stripGitSuffix(pathParts[0]);
      const cleanRepoName = stripGitSuffix(pathParts[1]);
      const repoIdentifier = `${cleanUsername}/${cleanRepoName}`;

      // Check usage limit only if the user is not authenticated
      if (!isAuthenticated) {
        const viewedRepos = JSON.parse(localStorage.getItem('viewedRepos') || '[]');
        // If repo is new and limit is reached, show prompt
        if (!viewedRepos.includes(repoIdentifier) && viewedRepos.length >= UNAUTHENTICATED_USAGE_LIMIT) {
          setShowLoginPrompt(true);
          return;
        }

        // If repo is new and limit is not reached, add it to tracking
        if (!viewedRepos.includes(repoIdentifier)) {
          viewedRepos.push(repoIdentifier);
          localStorage.setItem('viewedRepos', JSON.stringify(viewedRepos));
        }
      }

      // Proceed to the repo page (always without .git)
      navigate(`/${cleanUsername}/${cleanRepoName}`);
    } catch (e) {
      alert('Invalid URL format. Please enter a valid URL.');
    }
  };

// ...existing code...
      const handleApiError = () => {
        if (!isAuthenticated) {
            setShowLoginPrompt(true);
        }
    };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gray-900"></div>
        <span className="ml-4 text-lg font-semibold text-gray-700">Checking authentication...</span>
      </div>
    );
  }
  return (
    <div className="bg-[#FDFCFB] bg-[radial-gradient(#d1d1d1_1px,transparent_1px)] [background-size:24px_24px] min-h-screen font-sans text-gray-800 relative">
      {/* Persistent Auth/Rate Limit Banner */}
      {!isAuthenticated && (
        <div className="w-full bg-red-100 border-b border-red-400 text-red-800 px-4 py-2 text-center text-sm font-semibold z-50">
          <span className="mr-2">⚠️</span>
          You are not logged in. Some features may be unavailable or limited due to GitHub API rate limits. <button onClick={handleGitHubLogin} className="underline font-bold hover:text-red-600 ml-1">Log in with GitHub</button> for full access.
        </div>
      )}
      {rateLimitExceeded && (
        <div className="w-full bg-orange-100 border-b border-orange-400 text-orange-800 px-4 py-2 text-center text-sm font-semibold z-50">
          <span className="mr-2">⏳</span>
          GitHub API rate limit exceeded. Please try again later or log in with GitHub for higher limits.
        </div>
      )}
      {apiDown && (
        <div className="w-full bg-yellow-100 border-b border-yellow-400 text-yellow-800 px-4 py-2 text-center text-sm font-semibold z-50">
          <span className="mr-2">🚫</span>
          The backend server or GitHub API is currently unreachable. Please check your connection or try again later.
        </div>
      )}
      <canvas id="codeCanvas" className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-20"></canvas>
      <AppHeader 
        isAuthenticated={isAuthenticated} 
        user={user} 
        onLogout={handleLogout} 
        onLogin={handleGitHubLogin} 
        repoUrl={repoUrl} 
        setRepoUrl={setRepoUrl} 
        oncook={handleCookRepoUrl} 
      />

      {/* Brave Browser Warning Message */}
     {isBraveBrowser && !isAuthenticated && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
    <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] p-6 max-w-md text-center">
      <h2 className="text-lg font-bold mb-2">⚠️ Browser Settings Required</h2>
      <p className="text-sm text-gray-700 mb-4">
        For GitHub login to work properly, please:
        <br />• Allow cookies and third-party cookies
        <br />• Disable ad blockers for this site
        <br />• Enable JavaScript (if disabled)
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setIsBraveBrowser(false)}
          className="px-4 py-2 bg-[#F9C79A] border-2 border-black rounded-lg font-semibold hover:bg-amber-400 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
        >
          I've enabled them
        </button>
        <button
          onClick={handleGitHubLogin}
          className="px-4 py-2 bg-green-400 border-2 border-black rounded-lg font-semibold hover:bg-green-500 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
        >
          Try Login
        </button>
      </div>
      <button
        onClick={() => setIsBraveBrowser(false)}
        className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
      >
        Dismiss this message
      </button>
    </div>
  </div>
)}

 <AnimatePresence>
                {showLoginPrompt && (
                    <LoginPromptModal 
                        onLogin={handleGitHubLogin}
                        onClose={() => setShowLoginPrompt(false)}
                    />
                )}
            </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div 
          key={username && reponame ? "repo-view-active" : "landing-view-active"}
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)', transition: { duration: 0.5 } }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex-grow"
        >
          {!username || !reponame ? (
            <LandingPageContent key="landing" />
          ) : (
            <motion.main 
              key="repo-detail" 
              className="container mx-auto" 
              initial={{opacity: 0}} 
              animate={{opacity: 1}} 
              exit={{opacity: 0}}
            >
            <RepoDetailView 
              onApiError={handleApiError} 
              onRateLimitExceeded={() => setRateLimitExceeded(true)}
              onApiDown={() => setApiDown(true)}
            />

            </motion.main>
          )}
        </motion.div>
      </AnimatePresence>
      
      <footer className="text-center py-8 px-4 mt-16 border-t-2 border-black bg-white/50">
        <div className="flex flex-col items-center gap-3">
          <p className="flex items-center gap-2 text-gray-600 font-medium">
            Inspired by: <a href="https://gitingest.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Gitingest.com</a>
          </p>
          <p className="flex items-center gap-2 text-gray-600 font-medium">
            <LaptopIcon />
            Created by <a href="https://github.com/herin7" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Herin</a>
          </p>
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} GitForMe. All Rights Reserved.
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 bg-[#F9C79A] text-black p-4 rounded-full border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] z-40"
            initial={{ scale: 0, y: 50 }} 
            animate={{ scale: 1, y: 0 }} 
            exit={{ scale: 0, y: 50 }}
            whileHover={{ scale: 1.1, rotate: 5 }} 
            whileTap={{ scale: 0.9 }}
            aria-label="Open Chat"
          >
            <ChatIcon />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && <ChatbotPanel onClose={() => setIsChatOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default GitformeUi;
