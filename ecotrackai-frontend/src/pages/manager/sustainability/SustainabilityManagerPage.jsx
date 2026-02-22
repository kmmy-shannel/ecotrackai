import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../../services/auth.service';
import SustainabilityManagerLayout from '../../../components/manager/sustainability/SustainabilityManagerLayout';

const SustainabilityManagerPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    if (currentUser.role !== 'sustainability_manager' && currentUser.role !== 'admin') {
      navigate('/dashboard'); return;
    }
    setUser(currentUser);
  }, [navigate]);

  if (!user) return null;

  return (
    <SustainabilityManagerLayout currentPage="Sustainability Manager Dashboard" user={user}>
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-semibold">Sustainability Dashboard</p>
        <p className="text-sm mt-1">Carbon verification approvals will appear here.</p>
      </div>
    </SustainabilityManagerLayout>
  );
};

export default SustainabilityManagerPage;