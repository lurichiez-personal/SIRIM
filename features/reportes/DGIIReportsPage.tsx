// Página mejorada para generación automatizada de reportes DGII
// Sistema robusto con validaciones y cumplimiento fiscal

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTenantStore } from '../../stores/useTenantStore';
import { useDataStore } from '../../stores/useDataStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { validateAllDGIIReports, DGIIValidationResult, DGIIReportData } from '../../utils/dgiiValidation';
import { generate606, generate607, generate608, calculateAnexoA } from '../../utils/dgiiReportUtils';
import { ReportesIcon, InformationCircleIcon } from '../../components/icons/Icons';

interface ReportStatus {
  report606: 'idle' | 'validating' | 'generating' | 'completed' | 'error';
  report607: 'idle' | 'validating' | 'generating' | 'completed' | 'error';
  report608: 'idle' | 'validating' | 'generating' | 'completed' | 'error';
  anexoA: 'idle' | 'calculating' | 'completed' | 'error';
}

const DGIIReportsPage: React.FC = () => {
  const { selectedTenant } = useTenantStore();
  const { gastos, facturas, notasCredito, clientes } = useDataStore();
  const { addNotification } = useNotificationStore();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [reportStatus, setReportStatus] = useState<ReportStatus>({
    report606: 'idle',
    report607: 'idle', 
    report608: 'idle',
    anexoA: 'idle'
  });

  const [validationResults, setValidationResults] = useState<DGIIValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [anexoAData, setAnexoAData] = useState<any>(null);
  const [showAnexoModal, setShowAnexoModal] = useState(false);

  // Filtrar datos por período seleccionado
  const getFilteredData = (): DGIIReportData => {
    const year = parseInt(selectedMonth.substring(0, 4));
    const month = parseInt(selectedMonth.substring(4, 6));
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const filteredGastos = gastos.filter(g => {
      const fecha = new Date(g.fecha);
      return fecha >= startDate && fecha <= endDate;
    });

    const filteredFacturas = facturas.filter(f => {
      const fecha = new Date(f.fecha);
      return fecha >= startDate && fecha <= endDate && 
             ['Emitida', 'Pagada', 'PagadaParcialmente', 'Vencida'].includes(f.estado);
    });

    const filteredNotasCredito = notasCredito.filter(n => {
      const fecha = new Date(n.fecha);
      return fecha >= startDate && fecha <= endDate;
    });

    const filteredAnuladas = facturas.filter(f => {
      const fecha = new Date(f.fecha);
      return fecha >= startDate && fecha <= endDate && f.estado === 'Anulada';
    }).map(f => ({
      ncf: f.ncf || '',
      fecha: f.fecha,
      tipo: '01'
    }));

    return {
      gastos: filteredGastos,
      facturas: filteredFacturas,
      notasCredito: filteredNotasCredito,
      anuladas: filteredAnuladas,
      clientes,
      empresaRNC: selectedTenant?.rnc || '',
      period: selectedMonth
    };
  };

  // Validar todos los datos antes de generar reportes
  const validateData = async () => {
    const data = getFilteredData();
    
    addNotification({
      type: 'info',
      message: 'Validando datos para reportes DGII...',
      duration: 3000
    });

    // Simular validación asíncrona para UX mejorada
    await new Promise(resolve => setTimeout(resolve, 1500));

    const results = validateAllDGIIReports(data);
    setValidationResults(results);

    if (results.isValid) {
      addNotification({
        type: 'success',
        message: `Validación exitosa: ${results.summary.validRecords} registros válidos`,
        duration: 4000
      });
    } else {
      addNotification({
        type: 'error',
        message: `Errores encontrados: ${results.errors.length} problemas a resolver`,
        duration: 5000
      });
      setShowValidationModal(true);
    }

    return results;
  };

  // Generar reporte 606 (Compras y Gastos)
  const handleGenerate606 = async () => {
    setReportStatus(prev => ({ ...prev, report606: 'validating' }));
    
    const validation = await validateData();
    if (!validation.isValid) {
      setReportStatus(prev => ({ ...prev, report606: 'error' }));
      return;
    }

    setReportStatus(prev => ({ ...prev, report606: 'generating' }));
    
    try {
      const data = getFilteredData();
      generate606(data.gastos, data.empresaRNC, data.period);
      
      setReportStatus(prev => ({ ...prev, report606: 'completed' }));
      addNotification({
        type: 'success',
        message: `Reporte 606 generado exitosamente (${data.gastos.length} registros)`,
        duration: 5000
      });
    } catch (error) {
      setReportStatus(prev => ({ ...prev, report606: 'error' }));
      addNotification({
        type: 'error',
        message: 'Error al generar reporte 606',
        duration: 5000
      });
    }
  };

  // Generar reporte 607 (Ingresos y Ventas)
  const handleGenerate607 = async () => {
    setReportStatus(prev => ({ ...prev, report607: 'validating' }));
    
    const validation = await validateData();
    if (!validation.isValid) {
      setReportStatus(prev => ({ ...prev, report607: 'error' }));
      return;
    }

    setReportStatus(prev => ({ ...prev, report607: 'generating' }));
    
    try {
      const data = getFilteredData();
      generate607(data.facturas, data.notasCredito, data.empresaRNC, data.period);
      
      setReportStatus(prev => ({ ...prev, report607: 'completed' }));
      addNotification({
        type: 'success',
        message: `Reporte 607 generado exitosamente (${data.facturas.length + data.notasCredito.length} registros)`,
        duration: 5000
      });
    } catch (error) {
      setReportStatus(prev => ({ ...prev, report607: 'error' }));
      addNotification({
        type: 'error',
        message: 'Error al generar reporte 607',
        duration: 5000
      });
    }
  };

  // Generar reporte 608 (Comprobantes Anulados)
  const handleGenerate608 = async () => {
    setReportStatus(prev => ({ ...prev, report608: 'validating' }));
    
    const validation = await validateData();
    if (!validation.isValid) {
      setReportStatus(prev => ({ ...prev, report608: 'error' }));
      return;
    }

    setReportStatus(prev => ({ ...prev, report608: 'generating' }));
    
    try {
      const data = getFilteredData();
      generate608(data.anuladas, data.empresaRNC, data.period);
      
      setReportStatus(prev => ({ ...prev, report608: 'completed' }));
      addNotification({
        type: 'success',
        message: `Reporte 608 generado exitosamente (${data.anuladas.length} registros)`,
        duration: 5000
      });
    } catch (error) {
      setReportStatus(prev => ({ ...prev, report608: 'error' }));
      addNotification({
        type: 'error',
        message: 'Error al generar reporte 608',
        duration: 5000
      });
    }
  };

  // Calcular Anexo A / IT-1
  const handleCalculateAnexoA = async () => {
    setReportStatus(prev => ({ ...prev, anexoA: 'calculating' }));
    
    try {
      const data = getFilteredData();
      const anexoData = calculateAnexoA(
        { facturas: data.facturas, notas: data.notasCredito },
        data.gastos
      );
      
      setAnexoAData(anexoData);
      setReportStatus(prev => ({ ...prev, anexoA: 'completed' }));
      setShowAnexoModal(true);
      
      addNotification({
        type: 'success',
        message: 'Cálculo de Anexo A completado',
        duration: 4000
      });
    } catch (error) {
      setReportStatus(prev => ({ ...prev, anexoA: 'error' }));
      addNotification({
        type: 'error',
        message: 'Error al calcular Anexo A',
        duration: 5000
      });
    }
  };

  // Generar todos los reportes automáticamente
  const handleGenerateAllReports = async () => {
    const validation = await validateData();
    if (!validation.isValid) {
      addNotification({
        type: 'warning',
        message: 'Corrija los errores de validación antes de generar todos los reportes',
        duration: 6000
      });
      return;
    }

    // Generar reportes en secuencia
    await handleGenerate606();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await handleGenerate607();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await handleGenerate608();
    await handleCalculateAnexoA();

    addNotification({
      type: 'success',
      message: 'Todos los reportes DGII generados exitosamente',
      duration: 6000
    });
  };

  const formatPeriod = (period: string) => {
    const year = period.substring(0, 4);
    const month = period.substring(4, 6);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getButtonProps = (status: string) => {
    switch (status) {
      case 'validating':
        return { disabled: true, children: 'Validando...' };
      case 'generating':
      case 'calculating':
        return { disabled: true, children: 'Generando...' };
      case 'completed':
        return { variant: 'success' as const, children: 'Completado' };
      case 'error':
        return { variant: 'danger' as const, children: 'Error' };
      default:
        return { children: 'Generar' };
    }
  };

  const data = getFilteredData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-secondary-800">Reportes DGII Automatizados</h1>
        <div className="flex items-center space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-secondary-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-secondary-300 rounded-md px-3 py-2"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const value = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
              return (
                <option key={value} value={value}>
                  {formatPeriod(value)}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Resumen del período */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Período: {formatPeriod(selectedMonth)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{data.gastos.length}</div>
              <div className="text-sm text-secondary-600">Compras/Gastos (606)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{data.facturas.length}</div>
              <div className="text-sm text-secondary-600">Facturas (607)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.notasCredito.length}</div>
              <div className="text-sm text-secondary-600">Notas Crédito (607)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{data.anuladas.length}</div>
              <div className="text-sm text-secondary-600">Anuladas (608)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de generación rápida */}
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={validateData}
          variant="secondary"
          className="flex items-center space-x-2"
        >
          <span>🔍</span>
          <span>Validar Datos</span>
        </Button>
        
        <Button 
          onClick={handleGenerateAllReports}
          className="flex items-center space-x-2"
        >
          <span>📊</span>
          <span>Generar Todos los Reportes</span>
        </Button>
      </div>

      {/* Reportes individuales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Reporte 606 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ReportesIcon className="h-5 w-5" />
              <span>Reporte 606</span>
            </CardTitle>
            <p className="text-sm text-secondary-600">Compras y Gastos</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">{data.gastos.length}</span> registros
              </div>
              <Button 
                onClick={handleGenerate606}
                size="small"
                className="w-full"
                {...getButtonProps(reportStatus.report606)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reporte 607 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ReportesIcon className="h-5 w-5" />
              <span>Reporte 607</span>
            </CardTitle>
            <p className="text-sm text-secondary-600">Ingresos y Ventas</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">{data.facturas.length + data.notasCredito.length}</span> registros
              </div>
              <Button 
                onClick={handleGenerate607}
                size="small"
                className="w-full"
                {...getButtonProps(reportStatus.report607)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reporte 608 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ReportesIcon className="h-5 w-5" />
              <span>Reporte 608</span>
            </CardTitle>
            <p className="text-sm text-secondary-600">Comprobantes Anulados</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">{data.anuladas.length}</span> registros
              </div>
              <Button 
                onClick={handleGenerate608}
                size="small"
                className="w-full"
                {...getButtonProps(reportStatus.report608)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Anexo A / IT-1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ReportesIcon className="h-5 w-5" />
              <span>Anexo A / IT-1</span>
            </CardTitle>
            <p className="text-sm text-secondary-600">Resumen Fiscal</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-secondary-600">
                Cálculo automático
              </div>
              <Button 
                onClick={handleCalculateAnexoA}
                size="small"
                className="w-full"
                {...getButtonProps(reportStatus.anexoA)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de validación */}
      <Modal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        title="Resultados de Validación DGII"
      >
        {validationResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-secondary-800">{validationResults.summary.totalRecords}</div>
                <div className="text-sm text-secondary-600">Total Registros</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{validationResults.summary.validRecords}</div>
                <div className="text-sm text-secondary-600">Válidos</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">{validationResults.summary.invalidRecords}</div>
                <div className="text-sm text-secondary-600">Con Errores</div>
              </div>
            </div>

            {validationResults.errors.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-600 mb-2">Errores a Corregir:</h4>
                <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded text-sm">
                  {validationResults.errors.map((error, index) => (
                    <div key={index} className="mb-1">• {error}</div>
                  ))}
                </div>
              </div>
            )}

            {validationResults.warnings.length > 0 && (
              <div>
                <h4 className="font-semibold text-yellow-600 mb-2">Advertencias:</h4>
                <div className="max-h-32 overflow-y-auto bg-yellow-50 p-3 rounded text-sm">
                  {validationResults.warnings.slice(0, 5).map((warning, index) => (
                    <div key={index} className="mb-1">• {warning}</div>
                  ))}
                  {validationResults.warnings.length > 5 && (
                    <div className="text-yellow-600 font-medium">
                      ... y {validationResults.warnings.length - 5} advertencias más
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Anexo A - usando el componente existente AnexoAModal si está disponible */}
      {showAnexoModal && anexoAData && (
        <Modal
          isOpen={showAnexoModal}
          onClose={() => setShowAnexoModal(false)}
          title="Anexo A / IT-1 - Resumen Fiscal"
        >
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold">Período: {formatPeriod(selectedMonth)}</h3>
              <p className="text-sm text-secondary-600">Empresa: {selectedTenant?.nombre}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Total Ventas Neto:</div>
                <div className="text-lg font-bold text-green-600">
                  ${anexoAData.totalVentasNeto?.toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
              </div>
              <div>
                <div className="font-medium">ITBIS Ventas:</div>
                <div className="text-lg font-bold text-blue-600">
                  ${anexoAData.itbisVentas?.toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
              </div>
              <div>
                <div className="font-medium">Total Compras:</div>
                <div className="text-lg font-bold text-orange-600">
                  ${anexoAData.totalCompras?.toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
              </div>
              <div>
                <div className="font-medium">ITBIS Compras:</div>
                <div className="text-lg font-bold text-purple-600">
                  ${anexoAData.itbisCompras?.toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <div className="text-center">
                <div className="font-bold text-sm">ITBIS a Pagar:</div>
                <div className={`text-2xl font-bold ${anexoAData.itbisAPagar >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${anexoAData.itbisAPagar?.toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DGIIReportsPage;