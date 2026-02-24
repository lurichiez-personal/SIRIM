import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Gasto, Permission } from '../../types.ts';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { PlusIcon, DownloadIcon, TrashIcon, EyeIcon, UploadIcon, ArrowPathIcon, TrophyIcon, DocumentArrowDownIcon } from '../../components/icons/Icons.tsx';
import NuevoGastoModal from './NuevoGastoModal.tsx';
import { useDataStore } from '../../stores/useDataStore.ts';
import VistaPreviaGastoModal from './VistaPreviaGastoModal.tsx';
import Pagination from '../../components/ui/Pagination.tsx';
import Checkbox from '../../components/ui/Checkbox.tsx';
import { exportToCSV } from '../../utils/csvExport.ts';
import EscanearGastoModal from './EscanearGastoModal.tsx';
import Can from '../../components/Can.tsx';
import { useConfirmationStore } from '../../stores/useConfirmationStore.ts';
import { useAlertStore } from '../../stores/useAlertStore.ts';
import { formatCurrency } from '../../utils/formatters.ts';
import { applyPagination } from '../../utils/pagination.ts';
import { useTaskStore } from '../../stores/useTaskStore.ts';
import { DatePreset, getDateRange } from '../../utils/dateUtils.ts';

const ITEMS_PER_PAGE = 10;
const GASTO_CATEGORIAS_606 = [
    '01 - GASTOS DE PERSONAL', '02 - GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS', '03 - ARRENDAMIENTOS',
    '04 - GASTOS DE ACTIVOS FIJOS', '05 - GASTOS DE REPRESENTACIÓN', '06 - OTRAS DEDUCCIONES ADMITIDAS',
    '07 - GASTOS FINANCIEROS', '08 - GASTOS EXTRAORDINARIOS', '09 - COMPRAS E GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA',
    '10 - ADQUISICIONES DE ACTIVOS', '11 - GASTOS DE SEGUROS',
];

const GastosPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { gastos, addGasto, updateGasto, deleteGasto, bulkDeleteGastos, findGastoByNcfAndRnc, importGastosFromExcel, sincronizarNombresProveedores, setGastoAuditado, isLoading } = useDataStore(); 
    const { showConfirmation } = useConfirmationStore();
    const { showAlert } = useAlertStore();
    const { addTask, updateTaskProgress, completeTask, failTask } = useTaskStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [isVistaPreviaOpen, setIsVistaPreviaOpen] = useState(false);
    const [gastoParaEditar, setGastoParaEditar] = useState<Gasto | null>(null);
    const [gastoParaVer, setGastoParaVer] = useState<Gasto | null>(null);
    const [scannedData, setScannedData] = useState<Partial<Gasto> | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', category: 'todos', startDate: '', endDate: '' });
    const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const range = getDateRange(datePreset);
        setFilters(prev => ({ ...prev, startDate: range.start, endDate: range.end }));
    }, [datePreset]);

    const filteredGastos = useMemo(() => {
        let filtered = [...gastos];

        if (filters.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(g =>
                g.proveedorNombre?.toLowerCase().includes(lowerTerm) ||
                g.rncProveedor?.toLowerCase().includes(lowerTerm) ||
                g.ncf?.toLowerCase().includes(lowerTerm) ||
                g.descripcion.toLowerCase().includes(lowerTerm)
            );
        }
        if (filters.category !== 'todos') {
            filtered = filtered.filter(g => g.categoriaGasto === filters.category);
        }
        if (filters.startDate) {
            filtered = filtered.filter(f => f.fecha >= filters.startDate);
        }
        if (filters.endDate) {
            filtered = filtered.filter(f => f.fecha <= filters.endDate);
        }
        
        return filtered.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }, [gastos, filters]);

    const topProviderDelPeriodo = useMemo(() => {
        if (filteredGastos.length === 0) return null;

        const providerTotals = filteredGastos.reduce((acc, gasto) => {
            const providerName = gasto.proveedorNombre || 'Proveedor Desconocido';
            acc[providerName] = (acc[providerName] || 0) + Number(gasto.monto || 0);
            return acc;
        }, {} as Record<string, number>);

        let topProvider = { nombre: '', total: 0 };
        for (const [nombre, total] of Object.entries(providerTotals)) {
            if (Number(total) > topProvider.total) {
                topProvider = { nombre, total: Number(total) };
            }
        }

        return topProvider.total > 0 ? topProvider : null;
    }, [filteredGastos]);

    const pagedData = useMemo(() => {
        return applyPagination(filteredGastos, currentPage, ITEMS_PER_PAGE);
    }, [filteredGastos, currentPage]);


    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleSaveGasto = async (gastoData: Omit<Gasto, 'id' | 'empresaId' | 'conciliado'>) => {
        if (gastoParaEditar) {
            await updateGasto({ ...gastoParaEditar, ...gastoData });
        } else {
            await addGasto(gastoData);
        }
        setIsModalOpen(false);
        setScannedData(null);
        setGastoParaEditar(null);
    };
    
    const handleScanComplete = (data: Partial<Gasto>) => {
        if (data.ncf && data.rncProveedor) {
            const existingGasto = findGastoByNcfAndRnc(data.ncf, data.rncProveedor);
            if (existingGasto) {
                showAlert('Gasto Duplicado', `Ya existe un gasto registrado con el NCF ${data.ncf} para el proveedor con RNC ${data.rncProveedor}.`);
                setIsScanModalOpen(false);
                return;
            }
        }
        setScannedData(data);
        setIsScanModalOpen(false);
        setGastoParaEditar(null);
        setIsModalOpen(true);
    };

    const handleCloseNuevoGastoModal = () => {
        setIsModalOpen(false);
        setScannedData(null);
        setGastoParaEditar(null);
    };

    const handleDeleteGasto = (gasto: Gasto) => {
        showConfirmation(
            'Confirmar Eliminación',
            `¿Está seguro de que desea eliminar el gasto de "${gasto.proveedorNombre || gasto.descripcion}"? Esta acción también eliminará el asiento contable asociado y no se puede deshacer.`,
            async () => {
                await deleteGasto(gasto.id);
            }
        );
    };

    const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? new Set(pagedData.items.map(g => g.id)) : new Set());
    const handleSelectOne = (id: string, checked: boolean) => setSelectedIds(prev => { const newSet = new Set(prev); if (checked) newSet.add(id); else newSet.delete(id); return newSet; });
    const isAllSelected = pagedData.items.length > 0 && selectedIds.size === pagedData.items.length;

    const handleBulkDelete = () => {
        showConfirmation(
            'Confirmar Eliminación Masiva',
            `¿Está seguro que desea eliminar ${selectedIds.size} gastos? Esta acción no se puede deshacer.`,
            async () => {
                await bulkDeleteGastos(Array.from(selectedIds));
                setSelectedIds(new Set());
            }
        );
    };

    const handleExport = () => {
        if (!selectedTenant) return;
        exportToCSV(pagedData.items.map(g => ({
            'Fecha': g.fecha,
            'Proveedor': g.proveedorNombre,
            'RNC Proveedor': g.rncProveedor,
            'NCF': g.ncf,
            'Categoria': g.categoriaGasto,
            'Descripcion': g.descripcion,
            'Subtotal': g.subtotal,
            'ITBIS': g.itbis,
            'Monto Total': g.monto,
        })), 'gastos');
    };

    const handleExportPDF = () => {
        if (!selectedTenant) return;
        const totalGastos = filteredGastos.reduce((sum, g) => sum + g.monto, 0);
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Listado de Gastos - ${selectedTenant.nombre}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @page {
                        size: letter;
                        margin: 0.4in;
                    }
                    @media print {
                        .no-print { display: none !important; }
                        body { padding: 0 !important; margin: 0 !important; }
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    }
                    .checkbox-box {
                        width: 13px;
                        height: 13px;
                        border: 1.5px solid #475569;
                        display: inline-block;
                        border-radius: 2px;
                        background: #fff;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        table-layout: fixed;
                        font-size: 8.5pt;
                    }
                    th {
                        background-color: #f1f5f9;
                        color: #1e293b;
                        padding: 6px 4px;
                        border-bottom: 2px solid #cbd5e1;
                    }
                    td {
                        padding: 5px 4px;
                        border-bottom: 1px solid #e2e8f0;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: bold; }
                </style>
            </head>
            <body class="p-6 bg-white text-slate-900">
                <div class="no-print mb-6 flex justify-between items-center bg-slate-50 p-4 border rounded-lg shadow-sm">
                    <span class="text-sm font-medium text-slate-600">Vista previa del reporte (Tamaño Carta)</span>
                    <button onclick="window.print()" class="bg-[#005A9C] text-white px-8 py-2.5 rounded-md shadow-md hover:bg-[#004C8A] transition-all font-bold flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Confirmar e Imprimir
                    </button>
                </div>

                <header class="flex justify-between items-start border-b-2 border-[#005A9C] pb-4 mb-4">
                    <div>
                        <h1 class="text-xl font-black text-[#005A9C] uppercase">${selectedTenant.nombre}</h1>
                        <p class="text-xs font-bold text-slate-600 mt-1">RNC: ${selectedTenant.rnc}</p>
                    </div>
                    <div class="text-right">
                        <h2 class="text-base font-bold text-slate-800 uppercase tracking-wide">Reporte Auxiliar de Gastos</h2>
                        <p class="text-[9px] text-slate-500 mt-0.5">Generado el: ${new Date().toLocaleDateString('es-DO')}</p>
                    </div>
                </header>

                <table>
                    <thead>
                        <tr>
                            <th class="text-left w-[12%]">FECHA</th>
                            <th class="text-left w-[35%]">PROVEEDOR / DETALLE</th>
                            <th class="text-left w-[18%]">NCF</th>
                            <th class="text-right w-[15%]">SUBTOTAL</th>
                            <th class="text-right w-[12%]">MONTO TOTAL</th>
                            <th class="text-center w-[8%]">REV.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredGastos.map((g, i) => `
                            <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
                                <td class="text-left">${new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-DO', {day:'2-digit', month:'2-digit', year:'numeric'})}</td>
                                <td class="text-left font-medium">${g.proveedorNombre || g.descripcion}</td>
                                <td class="text-left font-mono text-[8pt] text-slate-600">${g.ncf || 'N/A'}</td>
                                <td class="text-right">${formatCurrency(g.subtotal).replace('RD$', '')}</td>
                                <td class="text-right font-bold">${formatCurrency(g.monto).replace('RD$', '')}</td>
                                <td class="text-center">
                                    <div class="checkbox-box"></div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="font-bold border-t-2 border-slate-300">
                            <td colspan="4" class="text-right py-3 text-sm">TOTAL GENERAL (DOP):</td>
                            <td class="text-right py-3 text-sm text-[#005A9C]">${formatCurrency(totalGastos).replace('RD$', '')}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>

                <div class="mt-12 grid grid-cols-2 gap-10">
                    <div class="text-center">
                        <div class="border-t border-slate-400 pt-1 text-[8pt] text-slate-500 uppercase">Firma del Revisor</div>
                    </div>
                    <div class="text-center">
                        <div class="border-t border-slate-400 pt-1 text-[8pt] text-slate-500 uppercase">Sello de Recibido</div>
                    </div>
                </div>

                <footer class="mt-10 pt-4 border-t border-slate-100 text-center text-[7pt] text-slate-400">
                    <p>Este reporte fue generado por SIRIM - Inteligencia Fiscal Dominicana. Hoja de Revisión Física para Comprobantes Fiscales.</p>
                </footer>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=950,height=1100');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const taskId = `import-gastos-${Date.now()}`;
        addTask(taskId, `Importando gastos desde ${file.name}`);
        
        try {
            const result = await importGastosFromExcel(file, (progress) => {
                updateTaskProgress(taskId, progress);
            });
            completeTask(taskId, result.message);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido al procesar el archivo.';
            failTask(taskId, message);
        } finally {
            if (event.target) event.target.value = ''; // Reset file input
        }
    };
    
    const handleSyncProveedores = async () => {
        showConfirmation(
            'Sincronizar Proveedores',
            'Esta acción buscará en la base de datos de la DGII los nombres de todos los proveedores marcados como "Proveedor Desconocido" que tengan un RNC. El proceso se ejecutará en segundo plano. ¿Desea continuar?',
            async () => {
                setIsSyncing(true);
                await sincronizarNombresProveedores();
                setIsSyncing(false);
            }
        );
    };

    const handleToggleAudit = async (gasto: Gasto) => {
        const newStatus = !gasto.auditado;
        await setGastoAuditado(gasto.id, newStatus);
    };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-secondary-800">Gastos</h1>
            <div className="flex space-x-2">
                <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>CSV</Button>
                <Button variant="secondary" leftIcon={<DocumentArrowDownIcon />} onClick={handleExportPDF}>PDF</Button>
                <Can I={Permission.GESTIONAR_BASE_DATOS_RNC}>
                    <Button 
                        variant="secondary" 
                        leftIcon={<ArrowPathIcon className={isSyncing ? 'animate-spin' : ''} />} 
                        onClick={handleSyncProveedores}
                        disabled={isSyncing}
                    >
                        {isSyncing ? 'Sincronizando...' : 'Sync Prov.'}
                    </Button>
                </Can>
                <Button variant="secondary" leftIcon={<UploadIcon />} onClick={handleImportClick}>Excel</Button>
                <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
                <Button variant="secondary" onClick={() => setIsScanModalOpen(true)}>IA Escanear</Button>
                <Button leftIcon={<PlusIcon />} onClick={() => { setGastoParaEditar(null); setScannedData(null); setIsModalOpen(true); }}>
                    Registrar
                </Button>
            </div>
        </div>
        
        <Card className="mb-6 bg-primary-50 border-primary-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Proveedor Principal del Período</CardTitle>
                <TrophyIcon className="h-4 w-4 text-secondary-400" />
            </CardHeader>
            <CardContent>
                {topProviderDelPeriodo ? (
                    <>
                        <div className="text-2xl font-bold text-primary">{topProviderDelPeriodo.nombre}</div>
                        <p className="text-xs text-secondary-500">
                            {formatCurrency(topProviderDelPeriodo.total)} en gastos en el período seleccionado.
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-secondary-500">No hay gastos registrados en el período seleccionado para mostrar un proveedor principal.</p>
                )}
            </CardContent>
        </Card>


        <Card>
            <CardHeader>
                <CardTitle>Listado de Gastos</CardTitle>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" placeholder="Buscar..." className="md:col-span-2 px-3 py-2 border border-secondary-300 rounded-md" value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} />
                    <select className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.category} onChange={e => handleFilterChange('category', e.target.value)}>
                        <option value="todos">Categorías</option>
                        {GASTO_CATEGORIAS_606.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <select className="px-3 py-2 border border-secondary-300 rounded-md" value={datePreset} onChange={e => setDatePreset(e.target.value as DatePreset)}>
                        <option value="this_month">Este Mes</option>
                        <option value="last_month">Mes Pasado</option>
                        <option value="last_30_days">Últimos 30 días</option>
                        <option value="this_quarter">Este Trimestre</option>
                        <option value="this_year">Este Año</option>
                        <option value="all">Siempre</option>
                        <option value="custom">Rango Personalizado</option>
                    </select>
                </div>
                 {datePreset === 'custom' && (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-start-3 flex items-center space-x-2">
                            <label htmlFor="startDate" className="text-sm flex-shrink-0">Desde:</label>
                            <input type="date" id="startDate" className="w-full px-3 py-2 border border-secondary-300 rounded-md" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                        </div>
                        <div className="flex items-center space-x-2">
                             <label htmlFor="endDate" className="text-sm flex-shrink-0">Hasta:</label>
                            <input type="date" id="endDate" className="w-full px-3 py-2 border border-secondary-300 rounded-md" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {selectedIds.size > 0 && (
                    <div className="bg-primary-50 p-3 rounded-md mb-4 flex items-center space-x-4">
                        <p className="text-sm font-semibold">{selectedIds.size} seleccionado(s)</p>
                        <Can I={Permission.ELIMINAR_GASTOS}>
                            <Button size="sm" variant="danger" onClick={handleBulkDelete} leftIcon={<TrashIcon />}>Eliminar</Button>
                        </Can>
                    </div>
                )}
               <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3"><Checkbox checked={isAllSelected} onChange={handleSelectAll} /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Monto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">NCF</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Acciones</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-primary uppercase tracking-wider">Match / Audit</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {isLoading ? (
                                <tr><td colSpan={8} className="text-center py-4">Cargando...</td></tr>
                            ) : pagedData.items.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-4 text-secondary-500">No se encontraron gastos.</td></tr>
                            ): (
                                pagedData.items.map(gasto => (
                                    <tr key={gasto.id} className={`hover:bg-secondary-50 ${selectedIds.has(gasto.id) ? 'bg-primary-50' : ''} ${gasto.auditado ? 'bg-green-50/30' : ''}`}>
                                        <td className="px-6 py-4"><Checkbox checked={selectedIds.has(gasto.id)} onChange={(checked) => handleSelectOne(gasto.id, checked)} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{gasto.proveedorNombre || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-DO')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-semibold">{formatCurrency(gasto.monto)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-mono">{gasto.ncf || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 truncate max-w-xs">{gasto.descripcion}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                            <div className="flex items-center space-x-4">
                                                <button onClick={() => { setGastoParaVer(gasto); setIsVistaPreviaOpen(true); }} className="text-secondary-500 hover:text-primary" title="Ver Gasto">
                                                    <EyeIcon className="h-5 w-5"/>
                                                </button>
                                                <button onClick={() => { setGastoParaEditar(gasto); setScannedData(null); setIsModalOpen(true); }} className="text-primary hover:text-primary-700">Editar</button>
                                                <Can I={Permission.ELIMINAR_GASTOS}>
                                                    <button onClick={() => handleDeleteGasto(gasto)} className="text-red-500 hover:text-red-700" title="Eliminar gasto">
                                                        <TrashIcon className="h-5 w-5"/>
                                                    </button>
                                                </Can>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center">
                                                <Checkbox 
                                                    checked={!!gasto.auditado} 
                                                    onChange={() => handleToggleAudit(gasto)}
                                                    title="Marcar como auditado físicamente"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalCount={pagedData.totalCount} pageSize={ITEMS_PER_PAGE} onPageChange={page => setCurrentPage(page)} />
            </CardContent>
        </Card>

        <NuevoGastoModal isOpen={isModalOpen} onClose={handleCloseNuevoGastoModal} onSave={handleSaveGasto} gastoParaEditar={gastoParaEditar} initialData={scannedData} />
        <VistaPreviaGastoModal isOpen={isVistaPreviaOpen} onClose={() => setIsVistaPreviaOpen(false)} gasto={gastoParaVer} />
        <EscanearGastoModal isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} onScanComplete={handleScanComplete} />
    </div>
  );
};

export default GastosPage;