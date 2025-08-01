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
                } finally {
                    setIsLoading(false);
                }
            };
            verifyUser();
            // Cross-tab/session sync for login/logout
            const handleStorage = (e) => {
                if (e.key !== 'gitforme_auth_state') {
                    return;
                }
                verifyUser();
            };
            window.addEventListener('storage', handleStorage);
            return () => window.removeEventListener('storage', handleStorage);
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
