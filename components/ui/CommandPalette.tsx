import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteStore } from '../../stores/useCommandPaletteStore.ts';
import { useDataStore } from '../../stores/useDataStore.ts';
import { 
    ClientesIcon, FacturasIcon, DashboardIcon, GastosIcon, 
    IngresosIcon, BanknotesIcon, InventarioIcon, UsersGroupIcon, 
    BookOpenIcon, ReportesIcon 
} from '../icons/Icons.tsx';
import { useDebounce } from '../../hooks/useDebounce.ts';

const CommandPalette: React.FC = () => {
    const { isOpen, close } = useCommandPaletteStore();
    const { clientes, facturas } = useDataStore();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 200);

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const navigationActions = useMemo(() => [
        { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
        { name: 'Clientes', href: '/dashboard/clientes', icon: ClientesIcon },
        { name: 'Facturación', href: '/dashboard/facturas', icon: FacturasIcon },
        { name: 'Gastos', href: '/dashboard/gastos', icon: GastosIcon },
        { name: 'Cobros', href: '/dashboard/cobros', icon: IngresosIcon },
        { name: 'Pagos', href: '/dashboard/pagos', icon: BanknotesIcon },
        { name: 'Inventario', href: '/dashboard/inventario', icon: InventarioIcon },
        { name: 'Nómina', href: '/dashboard/nomina', icon: UsersGroupIcon },
        { name: 'Contabilidad', href: '/dashboard/contabilidad', icon: BookOpenIcon },
        { name: 'Reportes DGII', href: '/dashboard/reportes', icon: ReportesIcon },
    ], []);

    const searchResults = useMemo(() => {
        if (!debouncedSearchTerm) {
            return { title: 'Navegación Rápida', items: navigationActions.map(a => ({...a, type: 'action'})) };
        }
        
        const term = debouncedSearchTerm.toLowerCase();
        
        const clientResults = clientes
            .filter(c => c.nombre.toLowerCase().includes(term) || c.rnc?.includes(term))
            .slice(0, 5)
            .map(c => ({ name: `${c.nombre} (Cliente)`, href: '/dashboard/clientes', type: 'cliente', icon: ClientesIcon }));
            
        const facturaResults = facturas
            .filter(f => f.ncf?.toLowerCase().includes(term) || f.clienteNombre.toLowerCase().includes(term))
            .slice(0, 5)
            .map(f => ({ name: `NCF ${f.ncf} - ${f.clienteNombre}`, href: '/dashboard/facturas', type: 'factura', icon: FacturasIcon }));

        const navResults = navigationActions
            .filter(a => a.name.toLowerCase().includes(term))
            .map(a => ({ ...a, type: 'action' }));

        return { title: 'Resultados', items: [...navResults, ...clientResults, ...facturaResults] };

    }, [debouncedSearchTerm, clientes, facturas, navigationActions]);
    
    const handleSelect = (href: string) => {
        navigate(href);
        close();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20 px-4" onClick={close}>
            <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-secondary-200">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar clientes, facturas o navegar..."
                        className="w-full text-lg focus:outline-none text-secondary-800"
                        autoFocus
                    />
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    <h3 className="px-3 py-2 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{searchResults.title}</h3>
                    <ul className="mt-1">
                        {searchResults.items.map((item, index) => (
                            <li
                                key={`${item.type}-${index}`}
                                onClick={() => handleSelect(item.href)}
                                className="flex items-center px-3 py-2.5 rounded-lg hover:bg-primary-50 group cursor-pointer transition-colors duration-150"
                            >
                                <div className="flex-shrink-0 p-2 bg-secondary-100 rounded-md group-hover:bg-primary-100 group-hover:text-primary transition-colors">
                                    <item.icon className="h-5 w-5 text-secondary-500 group-hover:text-primary" />
                                </div>
                                <div className="ml-4 flex-1">
                                    <span className="text-sm font-medium text-secondary-900 group-hover:text-primary-900">{item.name}</span>
                                    {item.type !== 'action' && (
                                        <p className="text-xs text-secondary-500">Haz clic para ir a la sección</p>
                                    )}
                                </div>
                                <ChevronRightIcon className="h-4 w-4 text-secondary-300 group-hover:text-primary-400" />
                            </li>
                        ))}
                         {debouncedSearchTerm && searchResults.items.length === 0 && (
                            <li className="px-3 py-8 text-center">
                                <p className="text-secondary-500">No se encontraron resultados para "{searchTerm}"</p>
                                <p className="text-xs text-secondary-400 mt-1">Prueba con términos más generales como "clientes" o un NCF parcial.</p>
                            </li>
                         )}
                    </ul>
                </div>
                <div className="bg-secondary-50 px-4 py-2 flex justify-between items-center text-[10px] text-secondary-400 border-t border-secondary-200">
                    <div className="flex items-center space-x-4">
                        <span><kbd className="border bg-white px-1 rounded shadow-sm">↵</kbd> para seleccionar</span>
                        <span><kbd className="border bg-white px-1 rounded shadow-sm">esc</kbd> para cerrar</span>
                    </div>
                    <span className="font-semibold uppercase tracking-tighter">SIRIM Search</span>
                </div>
            </div>
        </div>
    );
};

// Simple inline Chevron icon to avoid extra exports if not present
const ChevronRightIcon = ({ className }: { className: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

export default CommandPalette;