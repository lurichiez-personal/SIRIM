
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteStore } from '../../stores/useCommandPaletteStore';
import { useDataStore } from '../../stores/useDataStore';
import { ClientesIcon, FacturasIcon, DashboardIcon, GastosIcon } from '../icons/Icons';
import { useDebounce } from '../../hooks/useDebounce';

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
        { name: 'Dashboard', href: '/', icon: DashboardIcon },
        { name: 'Clientes', href: '/clientes', icon: ClientesIcon },
        { name: 'Facturación', href: '/facturas', icon: FacturasIcon },
        { name: 'Gastos', href: '/gastos', icon: GastosIcon },
    ], []);

    const searchResults = useMemo(() => {
        if (!debouncedSearchTerm) {
            return { title: 'Navegación Rápida', items: navigationActions.map(a => ({...a, type: 'action'})) };
        }
        
        const term = debouncedSearchTerm.toLowerCase();
        
        const clientResults = clientes
            .filter(c => c.nombre.toLowerCase().includes(term) || c.rnc?.includes(term))
            .slice(0, 3)
            .map(c => ({ name: `${c.nombre} (${c.rnc})`, href: '/clientes', type: 'cliente', icon: ClientesIcon }));
            
        const facturaResults = facturas
            .filter(f => f.ncf?.toLowerCase().includes(term) || f.clienteNombre.toLowerCase().includes(term))
            .slice(0, 3)
            .map(f => ({ name: `Factura ${f.ncf} (${f.clienteNombre})`, href: '/facturas', type: 'factura', icon: FacturasIcon }));

        return { title: 'Resultados de Búsqueda', items: [...clientResults, ...facturaResults] };

    }, [debouncedSearchTerm, clientes, facturas, navigationActions]);
    
    const handleSelect = (href: string) => {
        navigate(href);
        close();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20" onClick={close}>
            <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar clientes, facturas o navegar..."
                    className="w-full px-4 py-3 text-lg border-b border-gray-200 focus:outline-none"
                    autoFocus
                />
                <div className="p-2 max-h-96 overflow-y-auto">
                    <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">{searchResults.title}</h3>
                    <ul>
                        {searchResults.items.map((item, index) => (
                            <li
                                key={`${item.type}-${index}`}
                                onClick={() => handleSelect(item.href)}
                                className="flex items-center px-3 py-2 rounded-md hover:bg-primary-50 cursor-pointer"
                            >
                                <item.icon className="h-5 w-5 mr-3 text-secondary-500" />
                                <span className="text-secondary-800">{item.name}</span>
                            </li>
                        ))}
                         {debouncedSearchTerm && searchResults.items.length === 0 && (
                            <li className="px-3 py-4 text-center text-secondary-500">No se encontraron resultados.</li>
                         )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
