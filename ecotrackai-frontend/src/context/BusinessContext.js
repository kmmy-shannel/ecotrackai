import React, { createContext, useReducer, useCallback } from 'react';

/**
 * BusinessContext - Global business state
 * Manages current business context and business switching (for super admin)
 */
export const BusinessContext = createContext();

const initialState = {
  currentBusiness: null,
  businesses: [],
  loading: false,
  error: null,
};

const businessReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        businesses: action.payload,
        loading: false,
        error: null,
      };

    case 'FETCH_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case 'SET_CURRENT_BUSINESS':
      return {
        ...state,
        currentBusiness: action.payload,
      };

    case 'UPDATE_BUSINESS':
      return {
        ...state,
        businesses: state.businesses.map((b) =>
          b.business_id === action.payload.business_id ? action.payload : b
        ),
      };

    default:
      return state;
  }
};

export const BusinessProvider = ({ children }) => {
  const [state, dispatch] = useReducer(businessReducer, initialState);

  const setCurrentBusiness = useCallback((business) => {
    dispatch({ type: 'SET_CURRENT_BUSINESS', payload: business });
  }, []);

  const fetchBusinesses = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/businesses`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch businesses');

      const data = await response.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: data.data || [] });
    } catch (error) {
      dispatch({ type: 'FETCH_FAILURE', payload: error.message });
    }
  }, []);

  const updateBusiness = useCallback((business) => {
    dispatch({ type: 'UPDATE_BUSINESS', payload: business });
  }, []);

  const value = {
    ...state,
    setCurrentBusiness,
    fetchBusinesses,
    updateBusiness,
  };

  return (
    <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
  );
};

export default BusinessContext;

