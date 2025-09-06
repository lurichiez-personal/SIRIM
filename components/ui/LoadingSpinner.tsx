import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className={`inline-block animate-spin rounded-full border-4 border-solid border-primary-200 border-r-primary-600 ${sizeClasses[size]} ${className}`}>
      <span className="sr-only">Cargando...</span>
    </div>
  );
};

export default LoadingSpinner;