import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);
const OAUTH_CALLBACK_VERIFY_DELAY_MS = 1000;

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Add token fallback function
    const verifyWithTokenFallback = async () => {
        const apiServerUrl = import.meta.env.VITE_API_URL;
        let didRun = false;
        
        try {
            // First try session-based authentication
            const { data } = await axios.post(
                `${apiServerUrl}/api/auth/verifyUser`,
                {},
                { withCredentials: true }
            );
            
            if (data && data.status) {
                const userData = data.user || data;
                setUser(userData);
                setIsAuthenticated(true);
                return true;
            }
        } catch (sessionError) {
            console.log('Session auth failed, trying token fallback...');
            
            // Fallback to token-based authentication
            const token = localStorage.getItem('auth_token');
            if (token) {
                try {
                    const { data } = await axios.post(
                        `${apiServerUrl}/api/auth/verifyToken`,
                        { token },
                        { withCredentials: true }
                    );
                    
                    if (data && data.status) {
                        const userData = data.user || data;
                        setUser(userData);
                        setIsAuthenticated(true);
                        return true;
                    }
                } catch (error) {
                    setUser(null);
                    setIsAuthenticated(false);
                    // Fallback: force reload if session fails
                    if (!didRun && window.location.pathname !== '/login') {
                        didRun = true;
                        navigate('/login');
                    }
                    return false;
                }
            }
        }
        return false;
    };

    useEffect(() => {
        const verifyUser = async () => {
            try {
                await verifyWithTokenFallback();
                
                // Check URL for token (from OAuth redirect)
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');
                const success = urlParams.get('success');
                
                if (token && success === 'true') {
                    // Store token for fallback authentication
                    localStorage.setItem('auth_token', token);
                    
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // Verify with the new token
                    await verifyWithTokenFallback();
                }
                
            } catch (error) {
                console.error('Auth verification error:', error);
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };
        
        verifyUser();
        
        // If redirected from GitHub OAuth, verify again
        if (window.location.pathname === '/auth/github/callback' || window.location.search.includes('code=')) {
            setTimeout(verifyUser, OAUTH_CALLBACK_VERIFY_DELAY_MS);
        }
        
        // Cross-tab/session sync for login/logout
        const handleStorage = (e) => {
            if (e.key !== 'gitforme_auth_state') {
                return;
            }
            verifyUser();
        };
        
        // Also verify on focus (tab switch)
        const handleFocus = () => verifyUser();
        
        window.addEventListener('storage', handleStorage);
        window.addEventListener('focus', handleFocus);
        
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const login = (userData, token = null) => {
        setUser(userData);
        setIsAuthenticated(true);
        
        // Store token for fallback if provided
        if (token) {
            localStorage.setItem('auth_token', token);
        }
        
        localStorage.setItem('gitforme_auth_state', Date.now().toString());
    };

    const logout = async () => {
        try {
            const apiServerUrl = import.meta.env.VITE_API_URL;
            await axios.post(
                `${apiServerUrl}/api/auth/logout`, 
                {}, 
                { withCredentials: true }
            );
        } catch (error) {
            console.log('Logout API call failed, continuing with local cleanup');
        } finally {
            // Clear both session and token storage
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('auth_token');
            localStorage.setItem('gitforme_auth_state', Date.now().toString());
        }
    };
    
    const value = useMemo(() => ({
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        // Add function to refresh authentication
        refreshAuth: async () => {
            setIsLoading(true);
            await verifyWithTokenFallback();
            setIsLoading(false);
        }
    }), [user, isAuthenticated, isLoading]);

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
