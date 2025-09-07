
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../types';

interface CanProps {
  I: Permission; // "I can..."
  children: React.ReactNode;
}

const Can: React.FC<CanProps> = ({ I, children }) => {
  const { hasPermission } = usePermissions();

  if (hasPermission(I)) {
    return <>{children}</>;
  }

  return null;
};

export default Can;
