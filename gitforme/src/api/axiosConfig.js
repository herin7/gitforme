// apiClient.js
import axios from 'axios';

const apiServerUrl = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: `${apiServerUrl}`,
  withCredentials: true, // ✅ Keep this for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Add request interceptor for token fallback
apiClient.interceptors.request.use(
  (config) => {
    // Add token to headers if available (for adblocker scenarios)
    const token = localStorage.getItem('auth_token');
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add headers for CORS and adblocker detection
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    config.headers['X-Application'] = 'gitforme';
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Add response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh auth using token fallback
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Add token to the failed request and retry
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.log('Auth refresh failed, redirecting to login');
        
        // Clear auth state and redirect
        localStorage.removeItem('auth_token');
        localStorage.setItem('gitforme_auth_state', Date.now().toString());
        
        // Redirect to login if we're not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?error=session_expired';
        }
      }
    }
    
    // Handle network errors (common with adblockers)
    if (!error.response) {
      console.log('Network error - possible adblocker interference');
      
      // You might want to show a user-friendly message
      if (typeof window !== 'undefined' && window.showAdblockMessage) {
        window.showAdblockMessage();
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;