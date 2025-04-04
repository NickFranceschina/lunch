import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { User } from '../types/User';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  loading: boolean;
}

interface AuthContextType {
  authState: AuthState;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    user: null,
    loading: true
  });

  // Check for token on initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Set default auth header for all requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user info using the token
      axios.get('/api/users/me')
        .then(response => {
          setAuthState({
            isAuthenticated: true,
            token,
            user: response.data.data,
            loading: false
          });
        })
        .catch(() => {
          // If token is invalid, clear it
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setAuthState({
            isAuthenticated: false,
            token: null,
            user: null,
            loading: false
          });
        });
    } else {
      setAuthState({
        isAuthenticated: false,
        token: null,
        user: null,
        loading: false
      });
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token, user } = response.data;
      
      // Save token to local storage
      localStorage.setItem('token', token);
      
      // Set default auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setAuthState({
        isAuthenticated: true,
        token,
        user,
        loading: false
      });
    } catch (error) {
      throw new Error('Login failed');
    }
  };

  const logout = async () => {
    try {
      // Call the logout API endpoint if token exists
      if (authState.token) {
        await axios.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Remove token from local storage
      localStorage.removeItem('token');
      
      // Remove auth header
      delete axios.defaults.headers.common['Authorization'];
      
      // Update state
      setAuthState({
        isAuthenticated: false,
        token: null,
        user: null,
        loading: false
      });
    }
  };

  const updateUser = (user: User) => {
    setAuthState(prevState => ({
      ...prevState,
      user
    }));
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 