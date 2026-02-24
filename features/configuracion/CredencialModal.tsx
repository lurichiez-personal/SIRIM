import React, { useState, useEffect, useRef } from 'react';
import { Credencial, KeyCardEntry } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { EyeIcon, EyeSlashIcon, TrashIcon, SparklesIcon } from '../../components/icons/Icons';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import { GoogleGenAI, Type } from "@google/genai";
import { useAlertStore } from '../../stores/useAlertStore';

interface CredencialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Credencial, 'id' | 'empresaId'> | Credencial, imageFile?: File | null, removeImage?: boolean) => Promise<void>;
  credencialParaEditar: Credencial | null;
}

const CredencialModal: React.FC<CredencialModalProps> = ({ isOpen, onClose, onSave, credencialParaEditar }) => {
    const { showAlert } = useAlertStore();
    const [plataforma, setPlataforma] = useState('');
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [url, setUrl] = useState('');
    const [notas, setNotas] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDigitalizing, setIsDigitalizing] = useState(false);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [keyCardData, setKeyCardData] = useState<KeyCardEntry[]>([]);

    const isEditMode = !!credencialParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen) {
            if (credencialParaEditar) {
                setPlataforma(credencialParaEditar.plataforma);
                setUsuario(credencialParaEditar.usuario);
                setContrasena(credencialParaEditar.contrasena);
                setUrl(credencialParaEditar.url || '');
                setNotas(credencialParaEditar.notas || '');
                setImagePreview(credencialParaEditar.keyCardImageUrl || null);
                setKeyCardData(credencialParaEditar.keyCardData || []);
            } else {
                resetForm();
            }
        }
    }, [isOpen, credencialParaEditar]);

    const resetForm = () => {
        setPlataforma(''); setUsuario(''); setContrasena(''); setUrl(''); setNotas('');
        setError(''); setShowPassword(false); setIsSaving(false);
        setImageFile(null); setImagePreview(null);
        setKeyCardData([]);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!plataforma.trim() || !usuario.trim() || !contrasena.trim()) {
            setError('Plataforma, Usuario y Contraseña son campos obligatorios.');
            return;
        }
        setError('');
        setIsSaving(true);

        const data: any = { plataforma, usuario, contrasena, url, notas, keyCardData };
        const removeImage = isEditMode && !!credencialParaEditar.keyCardImageUrl && !imagePreview;

        if (isEditMode) {
            const updatedData = { ...credencialParaEditar, ...data };
            if (removeImage) {
                updatedData.keyCardImageUrl = '';
            }
            await onSave(updatedData, imageFile, removeImage);
        } else {
            const createData: Omit<Credencial, 'id' | 'empresaId'> = data;
            await onSave(createData, imageFile);
        }
        
        setIsSaving(false);
        handleClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setKeyCardData([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const digitalizeWithIA = async () => {
        if (!imageFile && !imagePreview) return;
        
        setIsDigitalizing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let base64Data = '';
            if (imageFile) {
                base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(imageFile);
                });
            } else if (imagePreview && imagePreview.startsWith('http')) {
                // Fetch existing image to digitalize
                const response = await fetch(imagePreview);
                const blob = await response.blob();
                base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            }

            if (!base64Data) throw new Error("No hay imagen para procesar.");

            const schema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        position: { type: Type.STRING, description: "El número de la posición (del 1 al 40)." },
                        code: { type: Type.STRING, description: "El código de seguridad de 5 dígitos." }
                    },
                    required: ["position", "code"]
                }
            };

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: "Analiza esta Tarjeta de Claves/Coordenadas. Extrae cada posición (número del 1 al 40) y su código de seguridad correspondiente (normalmente de 5 dígitos). Devuelve únicamente un JSON con el arreglo de objetos {position, code}." }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });

            const result = JSON.parse(response.text || '[]');
            setKeyCardData(result);
            showAlert('Digitalización Exitosa', `Se han extraído ${result.length} coordenadas de la tarjeta.`);

        } catch (error) {
            console.error("Error digitalizing card:", error);
            showAlert('Error de IA', 'No se pudo digitalizar la tarjeta. Por favor, asegúrese de que la imagen sea legible.');
        } finally {
            setIsDigitalizing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? 'Editar Credencial' : 'Nueva Credencial'} size="3xl">
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700">Plataforma *</label>
                                <input type="text" value={plataforma} onChange={e => setPlataforma(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" placeholder="Ej: DGII Oficina Virtual" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700">Usuario *</label>
                                    <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-secondary-700">Contraseña *</label>
                                    <input type={showPassword ? 'text' : 'password'} value={contrasena} onChange={e => setContrasena(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md pr-10" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-secondary-500">
                                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700">URL de Acceso</label>
                                <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md" placeholder="https://ejemplo.com/login" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700">Notas</label>
                                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="mt-1 w-full border-secondary-300 rounded-md" />
                            </div>
                        </div>

                        <div className="space-y-4 border-l pl-6">
                            <label className="block text-sm font-medium text-secondary-700">Tarjeta de Claves / Coordenadas</label>
                            {imagePreview ? (
                                <div className="space-y-3">
                                    <div className="relative group aspect-video">
                                        <img src={imagePreview} alt="Tarjeta de Claves" className="w-full h-full object-contain border rounded-lg bg-secondary-50" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                            <button type="button" onClick={handleRemoveImage} className="p-2 bg-red-600 text-white rounded-full">
                                                <TrashIcon className="h-6 w-6" />
                                            </button>
                                        </div>
                                    </div>
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        className="w-full py-2 bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100"
                                        onClick={digitalizeWithIA}
                                        disabled={isDigitalizing}
                                        leftIcon={<SparklesIcon className={isDigitalizing ? 'animate-spin' : ''} />}
                                    >
                                        {isDigitalizing ? 'Digitalizando con Helen...' : 'Digitalizar Tabla con IA'}
                                    </Button>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-secondary-300 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary-50 transition-colors"
                                >
                                    <SparklesIcon className="h-8 w-8 text-secondary-400 mb-2" />
                                    <span className="text-sm text-secondary-500 text-center px-4">Suba una foto de su tarjeta de claves para digitalizarla</span>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                </div>
                            )}

                            {keyCardData.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-bold text-secondary-500 uppercase mb-2">Vista Previa de Digitalización:</h4>
                                    <div className="max-h-40 overflow-y-auto border rounded-md">
                                        <table className="min-w-full divide-y divide-secondary-100 text-xs">
                                            <thead className="bg-secondary-50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold">Pos.</th>
                                                    <th className="px-3 py-2 text-left font-semibold">Código</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-secondary-100">
                                                {keyCardData.map((entry, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-1 font-mono text-secondary-500">{entry.position}</td>
                                                        <td className="px-3 py-1 font-bold">{entry.code}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                </div>
                <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={isSaving}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving || isDigitalizing}>{isSaving ? 'Guardando...' : 'Guardar Credencial'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CredencialModal;