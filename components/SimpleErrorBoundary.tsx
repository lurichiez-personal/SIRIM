import React from 'react';
import { InformationCircleIcon } from './icons/Icons';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error capturado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Error en la aplicación
              </h3>
              <p className="text-sm text-red-600 mt-1">
                Algo salió mal. Por favor, recarga la página.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SimpleErrorBoundary;