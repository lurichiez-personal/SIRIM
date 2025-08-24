
import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

interface ImportarClientesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}

const ImportarClientesModal: React.FC<ImportarClientesModalProps> = ({ isOpen, onClose, onImport }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSelectedFile(null);
            setFileName('');
        }
    }, [isOpen]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setFileName(file.name);
        } else {
            setSelectedFile(null);
            setFileName('');
        }
        event.target.value = '';
    };

    const handleConfirm = () => {
        if (selectedFile) {
            onImport(selectedFile);
        }
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Importar Clientes desde Archivo DGII"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={!selectedFile}>
                        Iniciar Importación
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-secondary-600">
                    Seleccione el archivo de texto (.txt) de contribuyentes descargado desde el portal de la DGII. La importación se ejecutará en segundo plano.
                </p>
                <div>
                    <label className="w-full flex items-center px-4 py-2 bg-white text-primary rounded-lg shadow-md tracking-wide uppercase border border-primary cursor-pointer hover:bg-primary-50">
                        <svg className="w-6 h-6 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3V9h2v2z" />
                        </svg>
                        <span className="text-sm leading-normal truncate">{fileName || 'Seleccionar archivo...'}</span>
                        <input type='file' className="hidden" accept=".txt,.csv" onChange={handleFileChange} />
                    </label>
                </div>
                {selectedFile && (
                    <p className="text-sm text-secondary-700">
                        Archivo listo para importar: <span className="font-semibold">{fileName}</span>
                    </p>
                )}
            </div>
        </Modal>
    );
};

export default ImportarClientesModal;