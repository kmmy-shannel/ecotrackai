import React from 'react';

const styles = {
  HIGH:   'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-orange-100 text-orange-700 border-orange-200',
  LOW:    'bg-green-100 text-green-700 border-green-200',
};

const PriorityBadge = ({ level }) => (
  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${styles[level] || styles.LOW}`}>
    {level || 'LOW'}
  </span>
);

export default PriorityBadge;