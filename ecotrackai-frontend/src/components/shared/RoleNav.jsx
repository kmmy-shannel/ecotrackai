import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getRoleNavItems } from '../../utils/rolePermissions';
import { Link, useLocation } from 'react-router-dom';

export const RoleNav = () => {
  const { role } = useAuth();
  const location = useLocation();
  const items = getRoleNavItems(role);

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = location.pathname === item.path.split('?')[0];
        return (
          <Link
            key={`${item.path}-${item.label}`}
            to={item.path}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-[var(--accent-500)] text-[var(--text-100)]'
                : 'text-[var(--text-300)] hover:bg-[var(--surface-700)] hover:text-[var(--text-100)]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default RoleNav;
