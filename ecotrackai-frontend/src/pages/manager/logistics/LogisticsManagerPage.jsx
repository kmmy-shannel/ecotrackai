import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../../services/auth.service';
import LogisticsManagerLayout from '../../../components/manager/logistics/LogisticsManagerLayout';

const LogisticsManagerPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    if (currentUser.role !== 'logistics_manager' && currentUser.role !== 'admin') {
      navigate('/dashboard'); return;
    }
    setUser(currentUser);
  }, [navigate]);

  if (!user) return null;

  return (
    <LogisticsManagerLayout currentPage="Logistics Manager Dashboard" user={user}>
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-semibold">Logistics Dashboard</p>
        <p className="text-sm mt-1">Pending route approvals will appear here.</p>
      </div>
    </LogisticsManagerLayout>
  );
};

export default LogisticsManagerPage;