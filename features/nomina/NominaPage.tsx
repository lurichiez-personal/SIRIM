import React, { useState } from 'react';
import { useTenantStore } from '../../stores/useTenantStore';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, DownloadIcon, UserMinusIcon, ArchiveBoxXMarkIcon } from '../../components/icons/Icons';
import { Empleado } from '../../types';
import NuevoEmpleadoModal from './NuevoEmpleadoModal';
import ProcesarNominaModal from './ProcesarNominaModal';
import { generateSirlaReport } from '../../utils/sirlaUtils';
import { useAlertStore } from '../../stores/useAlertStore';
import DesvinculacionModal from './DesvinculacionModal';
import HistorialDesvinculacionesModal from './HistorialDesvinculacionesModal';

const NominaPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { empleados, addEmpleado, updateEmpleado, addNomina, addDesvinculacion, desvinculaciones } = useDataStore();
    const { showAlert } = useAlertStore();

    const [isEmpleadoModalOpen, setIsEmpleadoModalOpen] = useState(false);
    const [isNominaModalOpen, setIsNominaModalOpen] = useState(false);
    const [isDesvinculacionModalOpen, setIsDesvinculacionModalOpen] = useState(false);
    const [isHistorialDesvinculacionesOpen, setIsHistorialDesvinculacionesOpen] = useState(false);
    const [empleadoParaEditar, setEmpleadoParaEditar] = useState<Empleado | null>(null);

    const handleOpenModalParaCrear = () => {
        setEmpleadoParaEditar(null);
        setIsEmpleadoModalOpen(true);
    };

    const handleOpenModalParaEditar = (empleado: Empleado) => {
        setEmpleadoParaEditar(empleado);
        setIsEmpleadoModalOpen(true);
    };
    
    const handleSaveEmpleado = (data: Omit<Empleado, 'id' | 'empresaId'> | Empleado) => {
        if ('id' in data) {
            updateEmpleado(data);
        } else {
            addEmpleado(data);
        }
    };

    const handleProcesarNomina = () => {
        if (empleados.filter(e => e.activo).length === 0) {
            showAlert('No hay empleados', 'Debe haber al menos un empleado activo para procesar la nómina.');
            return;
        }
        setIsNominaModalOpen(true);
    };
    
    const handleGenerarSirla = () => {
        if (!selectedTenant) return;
        if (empleados.filter(e => e.activo).length === 0) {
            showAlert('No hay empleados', 'Debe haber al menos un empleado activo para generar el reporte SIRLA.');
            return;
        }
        generateSirlaReport(selectedTenant.rnc, empleados);
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const calcularAntiguedad = (fechaIngreso: string) => {
        const start = new Date(fechaIngreso + 'T00:00:00');
        const end = new Date();

        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        
        if (end.getDate() < start.getDate()) {
            months--;
        }
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        const parts = [];
        if (years > 0) {
            parts.push(`${years} año${years > 1 ? 's' : ''}`);
        }
        if (months > 0) {
            parts.push(`${months} mes${months > 1 ? 'es' : ''}`);
        }
        
        if (years === 0 && months === 0) {
            return 'Menos de un mes';
        }

        return parts.join(', ');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Gestión de Empleados</h1>
                <div className="flex space-x-2">
                    <Button leftIcon={<PlusIcon />} onClick={handleOpenModalParaCrear}>Nuevo Empleado</Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                 <Card>
                    <CardHeader><CardTitle>Nómina</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <Button className="w-full" onClick={handleProcesarNomina}>Generar Nómina del Mes</Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Reportes</CardTitle></CardHeader>
                    <CardContent>
                         <Button className="w-full" variant="secondary" onClick={handleGenerarSirla} leftIcon={<DownloadIcon />}>Generar SIRLA (DGT-3)</Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Gestión de Personal</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <Button className="w-full" variant="secondary" onClick={() => setIsDesvinculacionModalOpen(true)} leftIcon={<UserMinusIcon />}>Registrar Desvinculación</Button>
                         <Button className="w-full" variant="secondary" onClick={() => setIsHistorialDesvinculacionesOpen(true)} leftIcon={<ArchiveBoxXMarkIcon />}>Historial de Salidas</Button>
                    </CardContent>
                </Card>
            </div>


            <Card>
                <CardHeader>
                    <CardTitle>Listado de Empleados</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Cédula</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Puesto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fecha Ingreso</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Tiempo en Empresa</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Salario Bruto</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {empleados.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-4 text-secondary-500">No hay empleados registrados.</td></tr>
                                ) : (
                                    empleados.map(emp => (
                                        <tr key={emp.id}>
                                            <td className="px-6 py-4 font-medium">{emp.nombre}</td>
                                            <td className="px-6 py-4">{emp.cedula}</td>
                                            <td className="px-6 py-4">{emp.puesto}</td>
                                            <td className="px-6 py-4">{new Date(emp.fechaIngreso + 'T00:00:00').toLocaleDateString('es-DO')}</td>
                                            <td className="px-6 py-4">{calcularAntiguedad(emp.fechaIngreso)}</td>
                                            <td className="px-6 py-4 text-right font-semibold">{formatCurrency(emp.salarioBrutoMensual)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {emp.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="secondary" onClick={() => handleOpenModalParaEditar(emp)}>Editar</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <NuevoEmpleadoModal 
                isOpen={isEmpleadoModalOpen}
                onClose={() => setIsEmpleadoModalOpen(false)}
                onSave={handleSaveEmpleado}
                empleadoParaEditar={empleadoParaEditar}
            />
            <ProcesarNominaModal
                isOpen={isNominaModalOpen}
                onClose={() => setIsNominaModalOpen(false)}
                onSave={addNomina}
                empleados={empleados.filter(e => e.activo)}
            />
            <DesvinculacionModal
                isOpen={isDesvinculacionModalOpen}
                onClose={() => setIsDesvinculacionModalOpen(false)}
                onSave={addDesvinculacion}
                empleados={empleados.filter(e => e.activo)}
            />
            <HistorialDesvinculacionesModal
                isOpen={isHistorialDesvinculacionesOpen}
                onClose={() => setIsHistorialDesvinculacionesOpen(false)}
                desvinculaciones={desvinculaciones}
            />
        </div>
    );
};

export default NominaPage;