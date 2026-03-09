import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * useAuth hook - Get current user and auth methods from AuthContext
 * @returns {object} Auth state and methods
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

export default useAuth;
