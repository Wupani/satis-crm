import React from 'react';
import { useAuth } from '../context/AuthContext';

const RoleGuard = ({ allowedRoles, children, fallback = null }) => {
  const { userRole } = useAuth();

  if (!userRole) {
    return fallback;
  }

  if (allowedRoles.includes(userRole)) {
    return children;
  }

  return fallback;
};

export default RoleGuard; 