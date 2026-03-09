import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import authService from '../services/auth.service';

/**
 * AuthContext - Global authentication state
 * Manages user, role, businessId, and authentication methods
 */
export const AuthContext = createContext();

const initialState = {
  user: null,
  role: null,
  businessId: null,
  userId: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const pickUserId = (user) => user?.userId ?? user?.user_id ?? null;
const pickBusinessId = (user) => user?.businessId ?? user?.business_id ?? null;

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        role: action.payload.user?.role || null,
        userId: pickUserId(action.payload.user),
        businessId: pickBusinessId(action.payload.user),
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...initialState,
        loading: false,
      };

    case 'RESTORE_TOKEN':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        role: action.payload.user?.role || null,
        userId: pickUserId(action.payload.user),
        businessId: pickBusinessId(action.payload.user),
        isAuthenticated: !!action.payload.token && !!action.payload.user,
        loading: false,
      };

    case 'UPDATE_USER':
      const mergedUser = { ...state.user, ...action.payload };
      return {
        ...state,
        user: mergedUser,
        role: mergedUser?.role || state.role,
        userId: pickUserId(mergedUser),
        businessId: pickBusinessId(mergedUser),
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
          dispatch({
            type: 'RESTORE_TOKEN',
            payload: { token, user: JSON.parse(user) },
          });
        } else {
          dispatch({ type: 'RESTORE_TOKEN', payload: { token: null, user: null } });
        }
      } catch (error) {
        console.error('Failed to restore token:', error);
        dispatch({ type: 'RESTORE_TOKEN', payload: { token: null, user: null } });
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (credentialsOrEmail, maybePassword) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const credentials = typeof credentialsOrEmail === 'object'
        ? credentialsOrEmail
        : { email: credentialsOrEmail, password: maybePassword };

      const result = await authService.login(credentials);
      const payload = result?.data || {};
      const token = payload?.token || null;
      const user = payload?.user || null;

      if (!token || !user) {
        throw new Error(result?.message || 'Login failed');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token,
          user,
        },
      });

      return result;
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error?.response?.data?.message || error.message || 'Authentication failed',
      });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const updateUser = useCallback((userData) => {
    localStorage.setItem('user', JSON.stringify({ ...state.user, ...userData }));
    dispatch({ type: 'UPDATE_USER', payload: userData });
  }, [state.user]);

  const value = {
    ...state,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
