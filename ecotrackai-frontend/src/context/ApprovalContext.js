import React, { createContext, useReducer, useCallback } from 'react';

/**
 * ApprovalContext - Global approval queue state
 * Manages pending approvals and approval workflow
 */
export const ApprovalContext = createContext();

const initialState = {
  pendingApprovals: [],
  approvalHistory: [],
  loading: false,
  error: null,
  filters: {
    approvalType: null,
    status: 'pending',
    businessId: null,
  },
};

const approvalReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        pendingApprovals: action.payload,
        loading: false,
        error: null,
      };

    case 'FETCH_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'UPDATE_APPROVAL':
      return {
        ...state,
        pendingApprovals: state.pendingApprovals.filter(
          (a) => a.approval_id !== action.payload.approval_id
        ),
      };

    default:
      return state;
  }
};

export const ApprovalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(approvalReducer, initialState);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const fetchPendingApprovals = useCallback(async (role, businessId) => {
    dispatch({ type: 'FETCH_START' });

    try {
      const query = new URLSearchParams();
      query.append('status', 'pending');
      if (role) query.append('role', role);
      if (role !== 'super_admin') query.append('business_id', businessId);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/approvals?${query}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch approvals');

      const data = await response.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: data.data || [] });
    } catch (error) {
      dispatch({ type: 'FETCH_FAILURE', payload: error.message });
    }
  }, []);

  const updateApproval = useCallback((approval) => {
    dispatch({ type: 'UPDATE_APPROVAL', payload: approval });
  }, []);

  const value = {
    ...state,
    setFilters,
    fetchPendingApprovals,
    updateApproval,
  };

  return (
    <ApprovalContext.Provider value={value}>{children}</ApprovalContext.Provider>
  );
};

export default ApprovalContext;

