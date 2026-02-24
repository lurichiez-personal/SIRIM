import React, { useState, useEffect, useMemo } from 'react';
import { Credencial } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { useDataStore } from '../../stores/useDataStore';
import { useConfirmationStore } from '../../stores/useConfirmationStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, TrashIcon, EyeIcon, SearchIcon, SparklesIcon } from '../../components/icons/Icons';
import Pagination from '../../components/ui/Pagination';
import CredencialModal from './CredencialModal.tsx';
import { applyPagination } from '../../utils/pagination';

const ITEMS_PER_PAGE = 10;

const CredencialesPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { credenciales, addCredencial, updateCredencial, deleteCredencial, isLoading } = useDataStore();
    const { showConfirmation } = useConfirmationStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [credencialParaEditar, setCredencialParaEditar] = useState<Credencial | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [keySearch, setKeySearch] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    
    const pagedData = useMemo(() => {
        let filtered = [...credenciales];
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c => c.plataforma.toLowerCase().includes(lowerTerm) || c.usuario.toLowerCase().includes(lowerTerm));
        }
        const sorted = filtered.sort((a,b) => a.plataforma.localeCompare(b.plataforma));
        return applyPagination(sorted, currentPage, ITEMS_PER_PAGE);
    }, [credenciales, currentPage, searchTerm]);

    const handleOpenModalParaCrear = () => {
        setCredencialParaEditar(null);
        setIsModalOpen(true);
    };

    const handleOpenModalParaEditar = (credencial: Credencial) => {
        setCredencialParaEditar(credencial);
        setIsModalOpen(true);
    };
    
    const handleSave = async (data: Omit<Credencial, 'id' | 'empresaId'> | Credencial, imageFile?: File | null, removeImage?: boolean) => {
        if ('id' in data) {
            await updateCredencial(data as Credencial, imageFile, removeImage);
        } else {
            await addCredencial(data, imageFile);
        }
    };
    
    const handleDelete = (id: string, plataforma: string) => {
        showConfirmation(
            'Confirmar Eliminación',
            `¿Está seguro de que desea eliminar las credenciales para "${plataforma}"?`,
            () => deleteCredencial(id)
        );
    };

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Gestor de Credenciales</h1>
                <Button leftIcon={<PlusIcon/>} onClick={handleOpenModalParaCrear}>
                    Nueva Credencial
                </Button>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Búsqueda y Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative max-w-md">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-secondary-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por plataforma o usuario..."
                            className="block w-full pl-10 pr-3 py-2 border border-secondary-300 rounded-md leading-5 bg-white placeholder-secondary-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {isLoading ? (
                    <Card><CardContent className="text-center py-12">Cargando credenciales...</CardContent></Card>
                ) : pagedData.items.length === 0 ? (
                    <Card><CardContent className="text-center py-12 text-secondary-500">No hay credenciales que coincidan con la búsqueda.</CardContent></Card>
                ) : (
                    pagedData.items.map(c => (
                        <Card key={c.id} className="overflow-hidden border-l-4 border-primary">
                            <div className="p-4 sm:p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-secondary-900">{c.plataforma}</h3>
                                            {c.keyCardData && c.keyCardData.length > 0 && (
                                                <span className="flex items-center text-[10px] font-black uppercase tracking-widest bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                                                    <SparklesIcon className="h-3 w-3 mr-1" /> IA Digitalizada
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-4 text-sm text-secondary-600">
                                            <p><span className="font-semibold">Usuario:</span> {c.usuario}</p>
                                            {c.url && <p><span className="font-semibold">URL:</span> <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{c.url.replace(/^https?:\/\//, '')}</a></p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {c.keyCardData && c.keyCardData.length > 0 && (
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                onClick={() => {
                                                    setExpandedCardId(expandedCardId === c.id ? null : c.id);
                                                    setKeySearch('');
                                                }}
                                                leftIcon={<SearchIcon className="h-4 w-4" />}
                                            >
                                                {expandedCardId === c.id ? 'Ocultar Buscador' : 'Buscar Clave'}
                                            </Button>
                                        )}
                                        <Button size="sm" variant="secondary" onClick={() => handleOpenModalParaEditar(c)} leftIcon={<EyeIcon className="h-4 w-4" />}>
                                            Editar
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(c.id, c.plataforma)}>
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {expandedCardId === c.id && c.keyCardData && (
                                    <div className="mt-6 pt-6 border-t animate-fade-in">
                                        <div className="bg-secondary-50 p-4 rounded-lg">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                                                <h4 className="font-bold text-secondary-700 flex items-center">
                                                    <SearchIcon className="h-5 w-5 mr-2 text-primary" />
                                                    Buscador de Coordenadas
                                                </h4>
                                                <div className="relative w-full md:w-64">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Posición (Ej: 15)..." 
                                                        className="w-full px-3 py-1.5 border rounded-md font-bold text-center"
                                                        value={keySearch}
                                                        onChange={(e) => setKeySearch(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                                                {c.keyCardData.map((item, idx) => {
                                                    const isMatch = keySearch && item.position === keySearch;
                                                    const uniqueId = `${c.id}-${item.position}`;
                                                    const isCopied = copiedId === uniqueId;
                                                    
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => handleCopy(item.code, uniqueId)}
                                                            title="Clic para copiar"
                                                            className={`relative flex flex-col items-center justify-center p-2 rounded border transition-all cursor-pointer hover:border-primary group/coord ${
                                                                isMatch 
                                                                    ? 'bg-primary text-white border-primary scale-110 shadow-lg ring-4 ring-primary-100 z-10' 
                                                                    : 'bg-white border-secondary-200'
                                                            }`}
                                                        >
                                                            {isCopied && (
                                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary-800 text-white text-[10px] px-2 py-1 rounded shadow-lg animate-bounce whitespace-nowrap">
                                                                    ¡Copiado!
                                                                </div>
                                                            )}
                                                            <span className={`text-[10px] font-mono ${isMatch ? 'text-primary-100' : 'text-secondary-400'}`}>
                                                                {item.position}
                                                            </span>
                                                            <span className={`text-sm font-black ${isMatch ? 'text-white' : 'text-secondary-800'}`}>
                                                                {item.code}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-secondary-400 text-center mt-4 uppercase tracking-widest font-bold">
                                                Tip: Haz clic en cualquier celda para copiar el código
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <div className="mt-6">
                <Pagination
                    currentPage={currentPage}
                    totalCount={pagedData.totalCount}
                    pageSize={ITEMS_PER_PAGE}
                    onPageChange={page => setCurrentPage(page)}
                />
            </div>

            <CredencialModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                credencialParaEditar={credencialParaEditar}
            />
        </div>
    );
};

export default CredencialesPage;