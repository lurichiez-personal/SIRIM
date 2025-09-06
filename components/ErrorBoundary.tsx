import React, { Component, ReactNode } from 'react';
import Button from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { InformationCircleIcon } from './icons/Icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    
    // Log del error para seguimiento
    this.logError(error, errorInfo);
    
    // Callback personalizado para manejo de errores
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ error, errorInfo });
  }

  private logError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // En producción, enviar a servicio de logging
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar con servicio de logging (Sentry, LogRocket, etc.)
      console.error('Error Report:', errorReport);
    } else {
      console.error('Error Report:', errorReport);
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Si hay un componente fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Componente de error por defecto
      return (
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <InformationCircleIcon className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-secondary-900">
                ¡Oops! Algo salió mal
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-secondary-600">
                Se ha producido un error inesperado en la aplicación. 
                Nuestro equipo ha sido notificado automáticamente.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-red-50 p-4 rounded-md">
                  <summary className="cursor-pointer text-red-800 font-medium mb-2">
                    Detalles técnicos del error
                  </summary>
                  <pre className="text-xs text-red-700 overflow-auto max-h-40">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="primary"
                  onClick={this.handleRetry}
                >
                  Intentar de nuevo
                </Button>
                <Button
                  variant="secondary"
                  onClick={this.handleReload}
                >
                  Recargar página
                </Button>
              </div>

              <p className="text-sm text-secondary-500">
                Si el problema persiste, contacte al soporte técnico.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente de error específico para secciones
export const SectionErrorBoundary: React.FC<Props> = ({ children, fallback, onError }) => (
  <ErrorBoundary 
    onError={onError}
    fallback={
      fallback || (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Error en esta sección
              </h3>
              <p className="text-sm text-red-600 mt-1">
                No se pudo cargar el contenido. Intente recargar la página.
              </p>
            </div>
          </div>
        </div>
      )
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;