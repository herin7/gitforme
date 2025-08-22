    import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
    import axios from 'axios';

    const AuthContext = createContext(null);

    export const useAuth = () => {
        return useContext(AuthContext);
    };

    export const AuthProvider = ({ children }) => {
        const [user, setUser] = useState(null);
        const [isAuthenticated, setIsAuthenticated] = useState(false);
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            let didRun = false;
            const verifyUser = async () => {
                try {
                    const apiServerUrl = import.meta.env.VITE_API_URL;
                    const { data } = await axios.post(
                        `${apiServerUrl}/api/auth/verifyUser`,
                        {},
                        { withCredentials: true }
                    );
                    if (data && data.status) {
                        const userData = data.user || data;
                        setUser(userData);
                        setIsAuthenticated(true);
                    } else {
                        setUser(null);
                        setIsAuthenticated(false);
                    }
                } catch (error) {
                    setUser(null);
                    setIsAuthenticated(false);
                    // Fallback: force reload if session fails
                    if (!didRun && window.location.pathname !== '/login') {
                        didRun = true;
                        setTimeout(() => window.location.reload(), 1000);
                    }
                } finally {
                    setIsLoading(false);
                }
            };
            // Always verify on mount
            verifyUser();
            // If redirected from GitHub OAuth, verify again
            if (window.location.pathname === '/auth/github/callback' || window.location.search.includes('code=')) {
                setTimeout(verifyUser, 500);
            }
            // Cross-tab/session sync for login/logout
            const handleStorage = (e) => {
                if (e.key !== 'gitforme_auth_state') {
                    return;
                }
                verifyUser();
            };
            window.addEventListener('storage', handleStorage);
            // Also verify on focus (tab switch)
            const handleFocus = () => verifyUser();
            window.addEventListener('focus', handleFocus);
            return () => {
                window.removeEventListener('storage', handleStorage);
                window.removeEventListener('focus', handleFocus);
            };
        }, []);

        const login = (userData) => {
            setUser(userData);
            setIsAuthenticated(true);
            localStorage.setItem('gitforme_auth_state', Date.now().toString());
        };

        const logout = async () => {
            try {
                const apiServerUrl = import.meta.env.VITE_API_URL;
                await axios.post(`${apiServerUrl}/api/auth/logout`, {}, { withCredentials: true });
            } catch (error) {
                // Logout API call failed, but continue with local state cleanup to ensure the user is logged out locally.
            } finally {
                setUser(null);
                setIsAuthenticated(false);
                localStorage.setItem('gitforme_auth_state', Date.now().toString());
            }
        };
        
        const value = useMemo(() => ({
            user,
            isAuthenticated,
            isLoading,
            login,
            logout,
        }), [user, isAuthenticated, isLoading]);

        return (
            <AuthContext.Provider value={value}>
                {!isLoading && children}
            </AuthContext.Provider>
        );
    };
