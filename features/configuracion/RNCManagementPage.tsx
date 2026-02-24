import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { DownloadIcon, InformationCircleIcon, UploadIcon } from '../../components/icons/Icons';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import Can from '../../components/Can';
import { Permission } from '../../types';

const DGII_RNC_URL = 'https://dgii.gov.do/app/WebApps/Consultas/RNC/DGII_RNC.zip';

const RNCManagementPage: React.FC = () => {
    const { status, lastUpdated, recordCount, statusMessage, progress, processRNCFile } = useDGIIDataStore();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await processRNCFile(file);
        }
        if (event.target) {
            event.target.value = '';
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const isProcessing = status === 'processing' || status === 'checking';

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Base de Datos de Contribuyentes (RNC)</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Estado de la Base de Datos Centralizada</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {status === 'ready' ? (
                            <div className="space-y-2">
                                <p className="text-lg"><span className="font-semibold">Registros:</span> {recordCount.toLocaleString()}</p>
                                <p className="text-lg"><span className="font-semibold">Última Actualización:</span> {new Date(lastUpdated).toLocaleString('es-DO')}</p>
                                <div className="flex items-center text-green-600 pt-2">
                                    <InformationCircleIcon className="h-5 w-5 mr-2"/>
                                    <span>Base de datos en la nube está operativa.</span>
                                </div>
                            </div>
                        ) : (
                             <div className="space-y-2">
                                <p className="text-lg"><span className="font-semibold">Registros:</span> {recordCount > 0 ? recordCount.toLocaleString() : 'N/A'}</p>
                                <p className="text-lg"><span className="font-semibold">Última Actualización:</span> {lastUpdated > 0 ? new Date(lastUpdated).toLocaleString('es-DO') : 'N/A'}</p>
                                <div className="flex items-center text-yellow-600 pt-2">
                                    <InformationCircleIcon className="h-5 w-5 mr-2"/>
                                    <span>{statusMessage || 'Verificando estado...'}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Can I={Permission.GESTIONAR_BASE_DATOS_RNC}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Actualizar Base de Datos (Administrador)</CardTitle>
                            <p className="text-sm text-secondary-600 mt-1">
                                Esta acción actualizará la base de datos de RNC para toda la organización. El proceso puede tardar varios minutos.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex flex-col md:flex-row gap-4">
                                <a href={DGII_RNC_URL} target="_blank" rel="noopener noreferrer" className="flex-1">
                                    <Button variant="primary" leftIcon={<DownloadIcon/>} className="w-full">
                                        Paso 1: Descargar Archivo
                                    </Button>
                                </a>
                                <Button 
                                    variant="secondary" 
                                    leftIcon={<UploadIcon/>} 
                                    onClick={triggerFileSelect}
                                    disabled={isProcessing}
                                    className="flex-1"
                                >
                                    {isProcessing ? 'Procesando...' : 'Paso 2: Subir y Procesar'}
                                </Button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".zip"
                                />
                            </div>
                            {isProcessing && (
                                <div>
                                    <div className="text-xs mt-3 flex items-center text-blue-600">
                                        <span>{statusMessage || `Procesando... (${progress.toFixed(0)}%)`}</span>
                                    </div>
                                    <div className="w-full bg-secondary-200 rounded-full h-1.5 mt-2">
                                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.2s ease-in-out' }}></div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Can>
            </div>
        </div>
    );
};

export default RNCManagementPage;