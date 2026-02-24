import React, { useState, useMemo, useEffect } from 'react';
import { Empleado, Nomina, NominaEmpleado, TipoNomina, FrecuenciaNomina } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { procesarNominaEmpleado } from '../../utils/payrollUtils';
import { useDataStore } from '../../stores/useDataStore';
import { useAlertStore } from '../../stores/useAlertStore';

interface ProcesarNominaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nomina: Omit<Nomina, 'id' | 'empresaId' | 'status' | 'generadoPor' | 'fechaGeneracion'>) => void;
  empleados: Empleado[];
}

const ProcesarNominaModal: React.FC<ProcesarNominaModalProps> = ({ isOpen, onClose, onSave, empleados }) => {
    const { getNominaForPeriodo } = useDataStore();
    const { showAlert } = useAlertStore();
    const [periodo, setPeriodo] = useState('');
    const [tipoNomina, setTipoNomina] = useState<TipoNomina>(TipoNomina.TSS);
    const [frecuencia, setFrecuencia] = useState<FrecuenciaNomina>(FrecuenciaNomina.Mensual);
    const [salariosEditados, setSalariosEditados] = useState<Record<string, string>>({});
    const [periodoExistente, setPeriodoExistente] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const currentPeriod = `${year}-${month}`;
            setPeriodo(currentPeriod);
            
            // Inicializar salarios basados en la frecuencia
            const initialSalaries: Record<string, string> = {};
            empleados.forEach(emp => {
                const base = tipoNomina === TipoNomina.Interna && emp.salarioRealMensual 
                    ? emp.salarioRealMensual 
                    : emp.salarioBrutoMensual;
                
                const factor = frecuencia === FrecuenciaNomina.Mensual ? 1 : 0.5;
                initialSalaries[emp.id] = (base * factor).toFixed(2);
            });
            setSalariosEditados(initialSalaries);

            const existingNomina = getNominaForPeriodo(currentPeriod);
            const existeMismoTipoYFrecuencia = existingNomina && 
                existingNomina.tipo === tipoNomina && 
                existingNomina.frecuencia === frecuencia;
            setPeriodoExistente(!!existeMismoTipoYFrecuencia);
        }
    }, [isOpen, empleados, tipoNomina, frecuencia]);

    const nominaCalculada = useMemo(() => {
        if (!isOpen) return [];
        return empleados.map(emp => {
            const salaryToProcess = parseFloat(salariosEditados[emp.id]) || 0;
            
            if (frecuencia === FrecuenciaNomina.Mensual) {
                const virtualEmp: Empleado = { ...emp, salarioBrutoMensual: salaryToProcess };
                return procesarNominaEmpleado(virtualEmp);
            } else {
                // Caso Quincenal
                // Para el ISR dominicano, se debe proyectar el ingreso mensual (x2) para ver en qué escala cae.
                const virtualEmpFullMonth: Empleado = { ...emp, salarioBrutoMensual: salaryToProcess * 2 };
                const monthlyResults = procesarNominaEmpleado(virtualEmpFullMonth);
                
                // Dividimos deducciones de TSS y ley entre 2 para la quincena.
                return {
                    ...monthlyResults,
                    salarioBruto: salaryToProcess,
                    afp: monthlyResults.afp / 2,
                    sfs: monthlyResults.sfs / 2,
                    isr: monthlyResults.isr / 2,
                    totalDeduccionesEmpleado: (monthlyResults.afp + monthlyResults.sfs + monthlyResults.isr) / 2,
                    sfsEmpleador: monthlyResults.sfsEmpleador / 2,
                    srlEmpleador: monthlyResults.srlEmpleador / 2,
                    afpEmpleador: monthlyResults.afpEmpleador / 2,
                    infotep: monthlyResults.infotep / 2,
                    totalAportesEmpleador: monthlyResults.totalAportesEmpleador / 2,
                    salarioNeto: salaryToProcess - ((monthlyResults.afp + monthlyResults.sfs + monthlyResults.isr) / 2),
                };
            }
        });
    }, [isOpen, empleados, salariosEditados, frecuencia]);

    const totals = useMemo(() => {
        return nominaCalculada.reduce((acc, emp) => ({
            salarioNeto: acc.salarioNeto + emp.salarioNeto,
            costoEmpresa: acc.costoEmpresa + emp.salarioBruto + emp.totalAportesEmpleador,
        }), { salarioNeto: 0, costoEmpresa: 0 });
    }, [nominaCalculada]);

    const handleSalaryChange = (id: string, value: string) => {
        setSalariosEditados(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = () => {
        if (periodoExistente) {
             showAlert('Acción Bloqueada', `Ya existe una nómina ${tipoNomina} - ${frecuencia} para el período ${periodo}.`);
             return;
        }
        const nominaData = {
            periodo,
            tipo: tipoNomina,
            frecuencia,
            empleados: nominaCalculada,
            totalPagado: totals.salarioNeto,
            totalCostoEmpresa: totals.costoEmpresa,
        };
        onSave(nominaData);
        onClose();
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Generar Nómina ${frecuencia} - ${periodo}`}
            size="5xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={periodoExistente}>Confirmar y Generar</Button>
                </>
            }
        >
            <div className="p-6">
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-primary-50 rounded-lg border border-primary-100 shadow-sm">
                        <h4 className="font-bold text-primary-800 text-sm mb-3">1. Fuente de Salario para este Pago</h4>
                        <div className="flex space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="radio" className="w-4 h-4 text-primary focus:ring-primary-400" checked={tipoNomina === TipoNomina.TSS} onChange={() => setTipoNomina(TipoNomina.TSS)} />
                                <span className="text-xs font-semibold text-secondary-700 group-hover:text-primary transition-colors">Salario TSS</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="radio" className="w-4 h-4 text-primary focus:ring-primary-400" checked={tipoNomina === TipoNomina.Interna} onChange={() => setTipoNomina(TipoNomina.Interna)} />
                                <span className="text-xs font-semibold text-secondary-700 group-hover:text-primary transition-colors">Salario Real (Interno)</span>
                            </label>
                        </div>
                    </div>
                    <div className="p-4 bg-secondary-50 rounded-lg border border-secondary-200 shadow-sm">
                        <h4 className="font-bold text-secondary-800 text-sm mb-3">2. Frecuencia del Pago Actual</h4>
                        <div className="flex space-x-6">
                             {Object.values(FrecuenciaNomina).map(f => (
                                <label key={f} className="flex items-center space-x-2 cursor-pointer group">
                                    <input type="radio" className="w-4 h-4 text-primary focus:ring-primary-400" checked={frecuencia === f} onChange={() => setFrecuencia(f)} />
                                    <span className="text-xs font-semibold text-secondary-700 group-hover:text-primary transition-colors">{f}</span>
                                </label>
                             ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[50vh] border rounded-lg shadow-inner">
                    <table className="min-w-full divide-y divide-secondary-200 text-xs">
                        <thead className="bg-secondary-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-secondary-700 uppercase tracking-tight">Nombre del Empleado</th>
                                <th className="px-4 py-3 text-right font-bold text-primary-900 w-40 bg-primary-100">Salario Bruto Periodo</th>
                                <th className="px-4 py-3 text-right font-medium text-secondary-500 uppercase tracking-tight">SFS</th>
                                <th className="px-4 py-3 text-right font-medium text-secondary-500 uppercase tracking-tight">AFP</th>
                                <th className="px-4 py-3 text-right font-medium text-secondary-500 uppercase tracking-tight">ISR</th>
                                <th className="px-4 py-3 text-right font-bold text-primary-700 uppercase tracking-tight">Neto a Recibir</th>
                                <th className="px-4 py-3 text-right font-medium text-secondary-500 uppercase tracking-tight">Costo Empresa</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {nominaCalculada.map(emp => (
                                <tr key={emp.empleadoId} className="hover:bg-primary-50/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-secondary-900">{emp.nombre}</td>
                                    <td className="px-4 py-3 text-right bg-primary-50/50">
                                        <div className="flex items-center justify-end">
                                            <span className="text-secondary-400 mr-1">RD$</span>
                                            <input 
                                                type="number" 
                                                value={salariosEditados[emp.empleadoId] || ''} 
                                                onChange={(e) => handleSalaryChange(emp.empleadoId, e.target.value)}
                                                className="w-full text-right bg-transparent border-none focus:ring-0 font-bold text-primary-900 p-0 text-sm"
                                                step="0.01"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-600 font-mono">({formatCurrency(emp.sfs).replace('RD$', '')})</td>
                                    <td className="px-4 py-3 text-right text-red-600 font-mono">({formatCurrency(emp.afp).replace('RD$', '')})</td>
                                    <td className="px-4 py-3 text-right text-red-600 font-mono">({formatCurrency(emp.isr).replace('RD$', '')})</td>
                                    <td className="px-4 py-3 text-right font-bold text-green-700 text-sm">{formatCurrency(emp.salarioNeto)}</td>
                                    <td className="px-4 py-3 text-right text-secondary-500 font-mono">{formatCurrency(emp.salarioBruto + emp.totalAportesEmpleador).replace('RD$', '')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right font-bold text-lg mt-6 bg-secondary-50 p-6 rounded-lg border border-secondary-200 shadow-sm">
                    <div className="flex flex-col border-r border-secondary-200 pr-4">
                        <span className="text-[10px] text-secondary-500 uppercase tracking-widest mb-1">Costo Total Empresa (Bruto + Aportes)</span>
                        <span className="text-red-700">{formatCurrency(totals.costoEmpresa)}</span>
                    </div>
                    <div className="flex flex-col pl-4">
                        <span className="text-[10px] text-secondary-500 uppercase tracking-widest mb-1">Total Neto a Desembolsar</span>
                        <span className="text-primary-700 text-2xl">{formatCurrency(totals.salarioNeto)}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ProcesarNominaModal;